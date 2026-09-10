using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Autenticacao;
using PeopleFlow.Infrastructure.Persistence;
using PeopleFlow.Infrastructure.Persistence.Seed;
using PeopleFlow.Infrastructure.Seguranca;

namespace PeopleFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, PeopleFlowPaths paths)
    {
        services.AddSingleton(paths);
        services.AddSingleton<AuditoriaInterceptor>();
        services.AddDbContext<PeopleFlowDbContext>((provider, options) => options
            .UseSqlite(paths.ConnectionString)
            .AddInterceptors(provider.GetRequiredService<AuditoriaInterceptor>()));
        services.AddScoped<IPeopleFlowDbContext>(sp => sp.GetRequiredService<PeopleFlowDbContext>());
        services.AddSingleton<ISenhaHasher, SenhaHasher>();
        services.AddSingleton<IContasDemo, ContasDemo>();
        services.AddScoped<DemoSeeder>();
        return services;
    }
}
