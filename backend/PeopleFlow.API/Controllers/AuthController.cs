using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PeopleFlow.API.Hosting;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Autenticacao;

namespace PeopleFlow.API.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase;

[Route("api/auth")]
public sealed class AuthController(AutenticacaoService autenticacao, IUsuarioAtual usuario) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<UsuarioLogadoDto> Login(LoginRequest request, CancellationToken ct)
    {
        var logado = await autenticacao.LoginAsync(request, ct);
        await EntrarAsync(logado);
        return await autenticacao.MeAsync(logado.Id, ct);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    public Task<UsuarioLogadoDto> Me(CancellationToken ct) => autenticacao.MeAsync(usuario.Id, ct);

    [HttpPut("senha")]
    public async Task<UsuarioLogadoDto> AlterarSenha(AlterarSenhaRequest request, CancellationToken ct)
    {
        await autenticacao.AlterarSenhaAsync(usuario.Id, request, ct);
        var atualizado = await autenticacao.LoginAsync(new LoginRequest((await autenticacao.MeAsync(usuario.Id, ct)).Login, request.NovaSenha), ct);
        await EntrarAsync(atualizado);
        return await autenticacao.MeAsync(atualizado.Id, ct);
    }

    [AllowAnonymous]
    [HttpGet("demo")]
    public Task<IReadOnlyList<ContaDemoDto>> Demo(CancellationToken ct) => autenticacao.ContasDemoAsync(ct);

    private Task EntrarAsync(Domain.Usuarios.Usuario logado) =>
        HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            Claims.Principal(logado),
            new AuthenticationProperties { IsPersistent = true, AllowRefresh = true });
}

[Route("health")]
public sealed class HealthController : ApiControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public object Get() => new { status = "ok", app = "PeopleFlow" };
}
