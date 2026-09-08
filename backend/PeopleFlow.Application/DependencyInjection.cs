using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Autenticacao;
using PeopleFlow.Application.BancoHoras;
using PeopleFlow.Application.Comum;
using PeopleFlow.Application.Empresas;
using PeopleFlow.Application.Feriados;
using PeopleFlow.Application.Funcionarios;
using PeopleFlow.Application.Jornadas;
using PeopleFlow.Application.Painel;
using PeopleFlow.Application.Ponto;
using PeopleFlow.Application.Usuarios;

namespace PeopleFlow.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<Relogio>();
        services.AddScoped<AcessoService>();
        services.AddScoped<ApuracaoService>();
        services.AddScoped<AutenticacaoService>();
        services.AddScoped<UsuarioService>();
        services.AddScoped<EmpresaService>();
        services.AddScoped<FeriadoService>();
        services.AddScoped<JornadaService>();
        services.AddScoped<FuncionarioService>();
        services.AddScoped<PontoService>();
        services.AddScoped<AjusteService>();
        services.AddScoped<BancoHorasService>();
        services.AddScoped<PainelService>();
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        return services;
    }
}
