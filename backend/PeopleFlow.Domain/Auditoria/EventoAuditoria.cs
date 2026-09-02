namespace PeopleFlow.Domain.Auditoria;

public sealed class EventoAuditoria
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public DateTime Quando { get; set; }

    public Guid? UsuarioId { get; set; }

    public string UsuarioNome { get; set; } = string.Empty;

    public string Entidade { get; set; } = string.Empty;

    public Guid EntidadeId { get; set; }

    public string Acao { get; set; } = string.Empty;

    public string? DetalhesJson { get; set; }

    public string? CorrelationId { get; set; }
}
