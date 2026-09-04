namespace PeopleFlow.Domain.Apuracao;

public sealed record TotaisPeriodo(
    int Dias,
    int PrevistoMinutos,
    int TrabalhadoMinutos,
    int ExtrasMinutos,
    int ExtrasNoturnasMinutos,
    int NoturnoFictoMinutos,
    int AtrasoMinutos,
    int SaidaAntecipadaMinutos,
    int AusenciaParcialMinutos,
    int FaltaMinutos,
    int IntervaloSuprimidoMinutos,
    int SaldoMinutos,
    int CreditoBancoMinutos,
    int DebitoBancoMinutos,
    int ExtrasAPagarMinutos,
    int DescontoMinutos,
    int DiasComFalta,
    int DiasInconsistentes,
    int DiasTrabalhados);

public static class ConsolidadorPeriodo
{
    public static TotaisPeriodo Consolidar(IReadOnlyCollection<ApuracaoDia> dias) => new(
        dias.Count,
        dias.Sum(d => d.PrevistoMinutos),
        dias.Sum(d => d.TrabalhadoMinutos),
        dias.Sum(d => d.ExtrasMinutos),
        dias.Sum(d => d.ExtrasNoturnasMinutos),
        dias.Sum(d => d.NoturnoFictoMinutos),
        dias.Sum(d => d.AtrasoMinutos),
        dias.Sum(d => d.SaidaAntecipadaMinutos),
        dias.Sum(d => d.AusenciaParcialMinutos),
        dias.Sum(d => d.FaltaMinutos),
        dias.Sum(d => d.IntervaloSuprimidoMinutos),
        dias.Sum(d => d.SaldoMinutos),
        dias.Sum(d => d.CreditoBancoMinutos),
        dias.Sum(d => d.DebitoBancoMinutos),
        dias.Sum(d => d.ExtrasAPagarMinutos),
        dias.Sum(d => d.DescontoMinutos),
        dias.Count(d => d.Situacao == SituacaoDia.Falta),
        dias.Count(d => d.Situacao == SituacaoDia.Inconsistente),
        dias.Count(d => d.TrabalhadoMinutos > 0));
}
