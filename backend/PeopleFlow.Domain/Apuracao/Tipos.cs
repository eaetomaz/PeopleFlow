using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.Domain.Apuracao;

public enum ModoTolerancia
{
    IntegralAoExceder,
    DescontarPorMarcacao
}

public enum DestinoHoraExtra
{
    BancoDeHoras,
    Pagamento
}

public enum TipoDia
{
    Util,
    Descanso,
    Feriado
}

public enum SituacaoDia
{
    Normal,
    Falta,
    Descanso,
    Feriado,
    TrabalhoEmDescanso,
    Inconsistente
}

public enum ClasseSegmento
{
    Normal,
    Extra,
    Tolerado,
    Atraso,
    SaidaAntecipada,
    AusenciaParcial,
    Falta,
    Noturno
}

public enum Inconsistencia
{
    MarcacoesImpares,
    AjustePendente,
    MarcacaoDuplicada,
    IntervaloIrregular,
    InterjornadaIrregular,
    HeAcimaDoLimite,
    ParSuspeito
}

public enum CodigoRegra
{
    ToleranciaAplicada,
    ToleranciaExcedidaPorMarcacao,
    ToleranciaExcedidaDiaria,
    ToleranciaDescontadaPorMarcacao,
    HoraExtraDiaUtil,
    HoraExtraDescansoFeriado,
    HoraNoturnaReduzida,
    ProrrogacaoNoturna,
    FeriadoAbonado,
    FeriadoCompensadoPelaEscala,
    DiaDeDescanso,
    Falta,
    Atraso,
    SaidaAntecipada,
    AusenciaParcial,
    IntervaloSuprimido,
    InterjornadaIrregular,
    LimiteHeExcedido,
    DestinoBancoDeHoras,
    DestinoPagamento,
    MarcacaoDuplicadaIgnorada,
    MarcacaoDesconsiderada,
    AjustePendenteIgnorado,
    MarcacoesImpares,
    DiaProvisorio
}

public readonly record struct Intervalo(DateTime Inicio, DateTime Fim)
{
    public int Minutos => (int)Math.Round((Fim - Inicio).TotalMinutes);
}

public sealed record ParametrosApuracao(
    int ToleranciaPorMarcacaoMinutos,
    int ToleranciaDiariaMinutos,
    ModoTolerancia ModoTolerancia,
    DestinoHoraExtra DestinoHoraExtra,
    DestinoHoraExtra DestinoHeDescansoFeriado,
    int PercentualHeDiaUtil,
    int PercentualHeDescansoFeriado,
    int LimiteDiarioHeMinutos,
    TimeOnly InicioNoturno,
    TimeOnly FimNoturno,
    bool HoraNoturnaReduzida,
    bool ProrrogacaoNoturna,
    int IntervaloMinimoAcima6hMinutos,
    int IntervaloMinimo4a6hMinutos,
    int InterjornadaMinimaMinutos,
    int JanelaDuplicidadeMinutos)
{
    public static ParametrosApuracao Padrao { get; } = new(
        5, 10, ModoTolerancia.IntegralAoExceder, DestinoHoraExtra.BancoDeHoras, DestinoHoraExtra.Pagamento,
        50, 100, 120, new TimeOnly(22, 0), new TimeOnly(5, 0), true, true, 60, 15, 660, 1);
}

public sealed record MarcacaoApurada(
    Guid Id,
    DateTime DataHora,
    OrigemMarcacao Origem = OrigemMarcacao.Registro,
    TipoAjuste? TipoAjuste = null,
    StatusAjuste? StatusAjuste = null,
    Guid? MarcacaoAlvoId = null);

public sealed record EntradaApuracaoDia(
    DateOnly Data,
    IReadOnlyList<Intervalo> Previsto,
    IReadOnlyList<MarcacaoApurada> Marcacoes,
    ParametrosApuracao Parametros,
    bool Feriado = false,
    bool FeriadosCompensados = false,
    IReadOnlyList<Intervalo>? Abonos = null,
    DateTime? UltimaSaidaAnterior = null);

public sealed record ParMarcacao(DateTime Entrada, DateTime? Saida);

public sealed record Segmento(DateTime Inicio, DateTime Fim, ClasseSegmento Classe)
{
    public int Minutos => (int)Math.Round((Fim - Inicio).TotalMinutes);
}

public sealed record RegraAplicada(CodigoRegra Codigo, int Valor1 = 0, int Valor2 = 0);

public sealed class ApuracaoDia
{
    public DateOnly Data { get; init; }

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

    public int DebitosMinutos => AtrasoMinutos + SaidaAntecipadaMinutos + AusenciaParcialMinutos + FaltaMinutos;

    public List<ParMarcacao> Pares { get; } = [];

    public List<Segmento> Segmentos { get; } = [];

    public List<Inconsistencia> Inconsistencias { get; } = [];

    public List<RegraAplicada> Regras { get; } = [];

    public List<Intervalo> PrevistoIntervalos { get; } = [];
}
