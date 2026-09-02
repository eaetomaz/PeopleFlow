using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Domain.Apuracao;

public sealed class ApuracaoDiaRegistro : Entidade
{
    public Guid FuncionarioId { get; set; }

    public DateOnly Data { get; set; }

    public TipoDia TipoDia { get; set; }

    public SituacaoDia Situacao { get; set; }

    public bool Provisorio { get; set; }

    public int PrevistoMinutos { get; set; }

    public int TrabalhadoMinutos { get; set; }

    public int ExtrasMinutos { get; set; }

    public int ExtrasPercentual { get; set; }

    public int ExtrasNoturnasMinutos { get; set; }

    public int AtrasoMinutos { get; set; }

    public int SaidaAntecipadaMinutos { get; set; }

    public int AusenciaParcialMinutos { get; set; }

    public int FaltaMinutos { get; set; }

    public int NoturnoRealMinutos { get; set; }

    public int NoturnoFictoMinutos { get; set; }

    public int IntervaloRealMinutos { get; set; }

    public int IntervaloSuprimidoMinutos { get; set; }

    public int ToleranciaDesconsideradaMinutos { get; set; }

    public int SaldoMinutos { get; set; }

    public int CreditoBancoMinutos { get; set; }

    public int DebitoBancoMinutos { get; set; }

    public int ExtrasAPagarMinutos { get; set; }

    public int DescontoMinutos { get; set; }

    public string InconsistenciasJson { get; set; } = "[]";

    public string RegrasJson { get; set; } = "[]";

    public string SegmentosJson { get; set; } = "[]";

    public string PrevistoJson { get; set; } = "[]";

    public Guid? PoliticaId { get; set; }

    public Guid? JornadaId { get; set; }

    public int VersaoMotor { get; set; }

    public DateTime CalculadoEm { get; set; }
}
