using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Auditoria;
using PeopleFlow.Domain.BancoHoras;
using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Infrastructure.Persistence;

public sealed class AuditoriaInterceptor(IServiceProvider services, TimeProvider tempo) : SaveChangesInterceptor
{
    private static readonly HashSet<string> Ocultos = new(StringComparer.Ordinal) { "SenhaHash", "CarimboSeguranca", "TentativasFalhas" };
    private static readonly HashSet<string> Ignorados = new(StringComparer.Ordinal) { "CriadoEm", "AtualizadoEm", "UltimoAcessoEm" };

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Registrar(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Registrar(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Registrar(DbContext? contexto)
    {
        if (contexto is null)
        {
            return;
        }

        var agora = tempo.GetUtcNow().UtcDateTime;
        var entradas = contexto.ChangeTracker.Entries().ToList();
        foreach (var entrada in entradas.Where(e => e.Entity is Entidade))
        {
            var entidade = (Entidade)entrada.Entity;
            if (entrada.State == EntityState.Added)
            {
                entidade.CriadoEm = agora;
                entidade.AtualizadoEm = agora;
            }
            else if (entrada.State == EntityState.Modified)
            {
                entidade.AtualizadoEm = agora;
            }
        }

        if (services.GetService<IHttpContextAccessor>()?.HttpContext is null)
        {
            return;
        }

        var (usuarioId, usuarioNome) = UsuarioAtual();
        var correlacao = CorrelationId();
        foreach (var entrada in entradas.Where(e => e.Entity is IAuditavel
            && e.Entity is not BancoHorasLancamento { Tipo: TipoLancamentoBanco.Apuracao }
            && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            var detalhes = Detalhes(entrada);
            if (entrada.State == EntityState.Modified && detalhes.Count == 0)
            {
                continue;
            }

            contexto.Add(new EventoAuditoria
            {
                Quando = agora,
                UsuarioId = usuarioId,
                UsuarioNome = usuarioNome,
                Entidade = entrada.Metadata.ClrType.Name,
                EntidadeId = ((Entidade)entrada.Entity).Id,
                Acao = entrada.State switch
                {
                    EntityState.Added => "Criado",
                    EntityState.Deleted => "Excluido",
                    _ => "Alterado"
                },
                DetalhesJson = JsonSerializer.Serialize(detalhes),
                CorrelationId = correlacao
            });
        }
    }

    private static Dictionary<string, object?> Detalhes(EntityEntry entrada)
    {
        var detalhes = new Dictionary<string, object?>();
        foreach (var propriedade in entrada.Properties)
        {
            var nome = propriedade.Metadata.Name;
            if (Ignorados.Contains(nome))
            {
                continue;
            }

            var oculto = Ocultos.Contains(nome);
            switch (entrada.State)
            {
                case EntityState.Added:
                    detalhes[nome] = oculto ? "***" : Valor(propriedade.CurrentValue);
                    break;
                case EntityState.Deleted:
                    detalhes[nome] = oculto ? "***" : Valor(propriedade.OriginalValue);
                    break;
                default:
                    if (propriedade.IsModified && !Equals(propriedade.OriginalValue, propriedade.CurrentValue))
                    {
                        detalhes[nome] = oculto
                            ? new { de = "***", para = "***" }
                            : new { de = Valor(propriedade.OriginalValue), para = Valor(propriedade.CurrentValue) };
                    }

                    break;
            }
        }

        return detalhes;
    }

    private static object? Valor(object? valor) => valor switch
    {
        null => null,
        Enum e => e.ToString(),
        DateOnly d => d.ToString("yyyy-MM-dd"),
        TimeOnly t => t.ToString("HH:mm"),
        _ => valor
    };

    private (Guid? Id, string Nome) UsuarioAtual()
    {
        var usuario = services.GetService<IHttpContextAccessor>()?.HttpContext?.RequestServices.GetService<IUsuarioAtual>();
        return usuario is { Autenticado: true } ? (usuario.Id, usuario.Nome) : (null, "Sistema");
    }

    private string? CorrelationId()
    {
        var contexto = services.GetService<IHttpContextAccessor>()?.HttpContext;
        return contexto?.Items.TryGetValue("CorrelationId", out var valor) == true ? valor as string : null;
    }
}
