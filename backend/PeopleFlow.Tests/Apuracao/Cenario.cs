using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.Tests.Apuracao;

internal static class Cenario
{
    public static readonly DateOnly Dia = new(2026, 9, 15);

    public static DateTime Em(string hora, int deslocamentoDias = 0)
    {
        var partes = hora.Split(':');
        return Dia.AddDays(deslocamentoDias).ToDateTime(new TimeOnly(int.Parse(partes[0]), int.Parse(partes[1])));
    }

    public static Intervalo Periodo(string entrada, string saida, int deslocamentoDias = 0)
    {
        var inicio = Em(entrada, deslocamentoDias);
        var fim = Em(saida, deslocamentoDias);
        if (fim <= inicio)
        {
            fim = fim.AddDays(1);
        }

        return new Intervalo(inicio, fim);
    }

    public static List<Intervalo> Administrativo => [Periodo("08:00", "12:00"), Periodo("13:30", "18:00")];

    public static List<MarcacaoApurada> Marcacoes(params string[] horas) =>
        horas.Select(h => new MarcacaoApurada(Guid.NewGuid(), h.StartsWith('+') ? Em(h[1..], 1) : Em(h))).ToList();

    public static ApuracaoDia Apurar(
        IReadOnlyList<Intervalo> previsto,
        IReadOnlyList<MarcacaoApurada> marcacoes,
        ParametrosApuracao? parametros = null,
        bool feriado = false,
        bool feriadosCompensados = false,
        DateTime? ultimaSaidaAnterior = null) =>
        MotorApuracao.Apurar(new EntradaApuracaoDia(
            Dia,
            previsto,
            marcacoes,
            parametros ?? ParametrosApuracao.Padrao,
            feriado,
            feriadosCompensados,
            null,
            ultimaSaidaAnterior));

    public static MarcacaoApurada Ajuste(DateTime dataHora, StatusAjuste status, TipoAjuste tipo = TipoAjuste.Inclusao, Guid? alvo = null) =>
        new(Guid.NewGuid(), dataHora, OrigemMarcacao.AjusteManual, tipo, status, alvo);
}
