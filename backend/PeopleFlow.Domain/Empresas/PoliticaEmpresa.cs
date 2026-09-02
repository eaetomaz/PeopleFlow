using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Domain.Empresas;

public sealed class PoliticaEmpresa : Entidade, IAuditavel
{
    public Guid EmpresaId { get; set; }

    public int Versao { get; set; }

    public DateOnly VigenteDesde { get; set; }

    public int ToleranciaPorMarcacaoMinutos { get; set; } = 5;

    public int ToleranciaDiariaMinutos { get; set; } = 10;

    public ModoTolerancia ModoTolerancia { get; set; } = ModoTolerancia.IntegralAoExceder;

    public DestinoHoraExtra DestinoHoraExtra { get; set; } = DestinoHoraExtra.BancoDeHoras;

    public DestinoHoraExtra DestinoHeDescansoFeriado { get; set; } = DestinoHoraExtra.Pagamento;

    public int PercentualHeDiaUtil { get; set; } = 50;

    public int PercentualHeDescansoFeriado { get; set; } = 100;

    public int LimiteDiarioHeMinutos { get; set; } = 120;

    public int AdicionalNoturnoPercentual { get; set; } = 20;

    public TimeOnly InicioNoturno { get; set; } = new(22, 0);

    public TimeOnly FimNoturno { get; set; } = new(5, 0);

    public bool HoraNoturnaReduzida { get; set; } = true;

    public bool ProrrogacaoNoturna { get; set; } = true;

    public int IntervaloMinimoAcima6hMinutos { get; set; } = 60;

    public int IntervaloMinimo4a6hMinutos { get; set; } = 15;

    public int InterjornadaMinimaMinutos { get; set; } = 660;

    public int ValidadeBancoMeses { get; set; } = 6;

    public int JanelaDuplicidadeMinutos { get; set; } = 1;

    public string? Observacao { get; set; }

    public Guid? CriadoPorId { get; set; }

    public ParametrosApuracao ParaApuracao() => new(
        ToleranciaPorMarcacaoMinutos,
        ToleranciaDiariaMinutos,
        ModoTolerancia,
        DestinoHoraExtra,
        DestinoHeDescansoFeriado,
        PercentualHeDiaUtil,
        PercentualHeDescansoFeriado,
        LimiteDiarioHeMinutos,
        InicioNoturno,
        FimNoturno,
        HoraNoturnaReduzida,
        ProrrogacaoNoturna,
        IntervaloMinimoAcima6hMinutos,
        IntervaloMinimo4a6hMinutos,
        InterjornadaMinimaMinutos,
        JanelaDuplicidadeMinutos);
}
