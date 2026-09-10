using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Infrastructure.Persistence.Seed;

namespace PeopleFlow.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public const string SeedVariable = "PEOPLEFLOW_SEED";

    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var escopo = services.CreateAsyncScope();
        var db = escopo.ServiceProvider.GetRequiredService<PeopleFlowDbContext>();
        var paths = escopo.ServiceProvider.GetRequiredService<PeopleFlowPaths>();
        var log = escopo.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Banco");

        var aplicadas = (await db.Database.GetAppliedMigrationsAsync(ct)).ToList();
        var pendentes = (await db.Database.GetPendingMigrationsAsync(ct)).ToList();
        var bancoNovo = aplicadas.Count == 0;

        if (pendentes.Count > 0)
        {
            if (!bancoNovo && File.Exists(paths.Database))
            {
                var backup = Path.Combine(paths.Backups, $"peopleflow-pre-migracao-{DateTime.Now:yyyyMMdd-HHmmss}.db");
                await db.Database.ExecuteSqlAsync($"VACUUM INTO {backup}", ct);
                log.LogInformation("Backup antes das migrations: {Backup}", backup);
            }

            log.LogInformation("Aplicando {Quantidade} migration(s).", pendentes.Count);
            await db.Database.MigrateAsync(ct);
        }

        if (!bancoNovo)
        {
            return;
        }

        var demo = !string.Equals(Environment.GetEnvironmentVariable(SeedVariable), "vazio", StringComparison.OrdinalIgnoreCase);
        var seeder = escopo.ServiceProvider.GetRequiredService<DemoSeeder>();
        await seeder.SemearAsync(demo, ct);

        if (demo)
        {
            var apuracao = escopo.ServiceProvider.GetRequiredService<ApuracaoService>();
            var ids = await db.Funcionarios.Select(f => f.Id).ToListAsync(ct);
            var (de, ate) = seeder.PeriodoDemo;
            await apuracao.RecalcularAsync(ids, de, ate, ct);
            log.LogInformation("Dados de demonstração criados para {Quantidade} funcionário(s).", ids.Count);
        }
    }
}
