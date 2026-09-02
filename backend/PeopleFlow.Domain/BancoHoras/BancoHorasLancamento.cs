using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Domain.BancoHoras;

public enum TipoLancamentoBanco
{
    Apuracao,
    AjusteManual,
    Compensacao,
    Pagamento,
    Expiracao
}

public sealed class BancoHorasLancamento : Entidade, IAuditavel
{
    public Guid FuncionarioId { get; set; }

    public DateOnly Data { get; set; }

    public int Minutos { get; set; }

    public TipoLancamentoBanco Tipo { get; set; }

    public string Descricao { get; set; } = string.Empty;

    public DateOnly? VenceEm { get; set; }

    public Guid? CriadoPorId { get; set; }

    public Guid? FechamentoId { get; set; }
}
