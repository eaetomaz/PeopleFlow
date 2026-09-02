namespace PeopleFlow.Domain.Comum;

public abstract class Entidade
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public DateTime CriadoEm { get; set; }

    public DateTime AtualizadoEm { get; set; }
}

public interface IAuditavel;
