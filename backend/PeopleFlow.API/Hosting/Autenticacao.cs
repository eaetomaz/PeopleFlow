using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using PeopleFlow.API.Http;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Autenticacao;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.API.Hosting;

public static class Politicas
{
    public const string Administrar = "Administrar";
    public const string GerirCadastros = "GerirCadastros";
    public const string AprovarAjustes = "AprovarAjustes";
    public const string VerEquipe = "VerEquipe";
}

public static class Claims
{
    public const string Id = "sub";
    public const string Nome = "name";
    public const string Perfil = "role";
    public const string Funcionario = "funcionarioId";
    public const string Carimbo = "carimbo";

    public static ClaimsPrincipal Principal(Usuario usuario)
    {
        var claims = new List<Claim>
        {
            new(Id, usuario.Id.ToString()),
            new(Nome, usuario.Nome),
            new(Perfil, usuario.Perfil.ToString()),
            new(Carimbo, usuario.CarimboSeguranca.ToString())
        };
        if (usuario.FuncionarioId is { } funcionario)
        {
            claims.Add(new Claim(Funcionario, funcionario.ToString()));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme, Nome, Perfil));
    }
}

public sealed class UsuarioAtual(IHttpContextAccessor acessor) : IUsuarioAtual
{
    private ClaimsPrincipal? Principal => acessor.HttpContext?.User;

    private bool SemRequisicao => acessor.HttpContext is null;

    public bool Autenticado => Principal?.Identity?.IsAuthenticated == true;

    public Guid Id => Guid.TryParse(Principal?.FindFirstValue(Claims.Id), out var id) ? id : Guid.Empty;

    public string Nome => Principal?.FindFirstValue(Claims.Nome) ?? "Sistema";

    public Perfil Perfil => SemRequisicao
        ? Perfil.Admin
        : Enum.TryParse<Perfil>(Principal?.FindFirstValue(Claims.Perfil), out var perfil) && Autenticado ? perfil : Perfil.Funcionario;

    public Guid? FuncionarioId => Guid.TryParse(Principal?.FindFirstValue(Claims.Funcionario), out var id) ? id : null;
}

public static class AutenticacaoExtensions
{
    public const string CookieName = "peopleflow.auth";

    public static IServiceCollection AddAutenticacaoPeopleFlow(this IServiceCollection services)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = CookieName;
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Strict;
                options.Cookie.SecurePolicy = CookieSecurePolicy.None;
                options.ExpireTimeSpan = TimeSpan.FromHours(10);
                options.SlidingExpiration = true;
                options.Events = new CookieAuthenticationEvents
                {
                    OnRedirectToLogin = context => Problems.WriteAsync(context.HttpContext, StatusCodes.Status401Unauthorized),
                    OnRedirectToAccessDenied = context => Problems.WriteAsync(context.HttpContext, StatusCodes.Status403Forbidden),
                    OnValidatePrincipal = ValidarAsync
                };
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Politicas.Administrar, policy => policy.RequireRole(nameof(Perfil.Admin)))
            .AddPolicy(Politicas.GerirCadastros, policy => policy.RequireRole(nameof(Perfil.Admin), nameof(Perfil.RH)))
            .AddPolicy(Politicas.AprovarAjustes, policy => policy.RequireRole(nameof(Perfil.Admin), nameof(Perfil.RH), nameof(Perfil.Gestor)))
            .AddPolicy(Politicas.VerEquipe, policy => policy.RequireRole(nameof(Perfil.Admin), nameof(Perfil.RH), nameof(Perfil.Gestor)));

        return services;
    }

    private static async Task ValidarAsync(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        if (!Guid.TryParse(principal?.FindFirstValue(Claims.Id), out var id)
            || !Guid.TryParse(principal?.FindFirstValue(Claims.Carimbo), out var carimbo))
        {
            context.RejectPrincipal();
            return;
        }

        var servico = context.HttpContext.RequestServices.GetRequiredService<AutenticacaoService>();
        if (!await servico.SessaoValidaAsync(id, carimbo, context.HttpContext.RequestAborted))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }
    }
}
