using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;

namespace PeopleFlow.Application.Apuracao;

public sealed record RegraDto(string Codigo, string Texto, string? Base);

public static class ExplicadorRegras
{
    public static RegraDto Explicar(RegraAplicada regra)
    {
        var a = regra.Valor1;
        var b = regra.Valor2;
        var (texto, fundamento) = regra.Codigo switch
        {
            CodigoRegra.ToleranciaAplicada => ($"Variações de {a} min no dia ficaram dentro da tolerância e foram desconsideradas (limite diário de {b} min).", "CLT art. 58, § 1º"),
            CodigoRegra.ToleranciaExcedidaPorMarcacao => ($"Tolerância não aplicada: uma variação de {a} min passa dos {b} min permitidos por marcação, então todo o tempo conta.", "CLT art. 58, § 1º; Súmula 366 do TST"),
            CodigoRegra.ToleranciaExcedidaDiaria => ($"Tolerância não aplicada: as variações somam {a} min e passam do limite diário de {b} min, então todo o tempo conta.", "CLT art. 58, § 1º; Súmula 366 do TST"),
            CodigoRegra.ToleranciaDescontadaPorMarcacao => ($"Política da empresa: {a} min de variações pequenas foram desconsiderados e {b} min continuam contando.", "Política da empresa"),
            CodigoRegra.HoraExtraDiaUtil => ($"{Duracao.Formatar(a)} de hora extra em dia útil, com adicional de {b}%.", "CLT art. 59; CF art. 7º, XVI"),
            CodigoRegra.HoraExtraDescansoFeriado => ($"{Duracao.Formatar(a)} trabalhadas em dia de descanso ou feriado, com adicional de {b}%.", "Lei 605/49, art. 9º; Súmula 146 do TST"),
            CodigoRegra.HoraNoturnaReduzida => ($"{Duracao.Formatar(a)} de relógio no período noturno valem {Duracao.Formatar(b)} com a hora noturna de 52 min 30 s.", "CLT art. 73, § 1º"),
            CodigoRegra.ProrrogacaoNoturna => ($"{Duracao.Formatar(a)} depois das 5h continuam noturnas porque a jornada noturna foi cumprida e prorrogada.", "CLT art. 73, § 5º; Súmula 60, II, do TST"),
            CodigoRegra.FeriadoAbonado => ($"Feriado: as {Duracao.Formatar(a)} previstas foram abonadas.", "Lei 605/49"),
            CodigoRegra.FeriadoCompensadoPelaEscala => ("Feriado tratado como dia normal porque a escala já compensa feriados.", "CLT art. 59-A, parágrafo único"),
            CodigoRegra.DiaDeDescanso => ("Dia sem horário previsto na jornada (descanso).", null),
            CodigoRegra.Falta => ($"Falta: nenhuma marcação no dia, {Duracao.Formatar(a)} previstas não trabalhadas.", null),
            CodigoRegra.Atraso => ($"Atraso de {Duracao.Formatar(a)} na entrada.", null),
            CodigoRegra.SaidaAntecipada => ($"Saída antecipada de {Duracao.Formatar(a)}.", null),
            CodigoRegra.AusenciaParcial => ($"Ausência de {Duracao.Formatar(a)} dentro do horário previsto.", null),
            CodigoRegra.IntervaloSuprimido => ($"Intervalo de {a} min, abaixo do mínimo de {b} min. {Duracao.Formatar(b - a)} de intervalo suprimido.", "CLT art. 71, caput e § 4º"),
            CodigoRegra.InterjornadaIrregular => ($"Descanso de {Duracao.Formatar(a)} desde a última saída, abaixo das {Duracao.Formatar(b)} entre jornadas.", "CLT art. 66"),
            CodigoRegra.LimiteHeExcedido => ($"{Duracao.Formatar(a)} de hora extra passam do limite diário de {Duracao.Formatar(b)}.", "CLT art. 59"),
            CodigoRegra.DestinoBancoDeHoras => ($"Banco de horas: crédito de {Duracao.Formatar(a)} e débito de {Duracao.Formatar(b)}.", "CLT art. 59, § 2º e § 5º"),
            CodigoRegra.DestinoPagamento => ($"Folha: {Duracao.Formatar(a)} de extras a pagar e {Duracao.Formatar(b)} a descontar.", null),
            CodigoRegra.MarcacaoDuplicadaIgnorada => ($"{a} marcação(ões) repetida(s) no mesmo minuto foram ignoradas.", null),
            CodigoRegra.MarcacaoDesconsiderada => ($"{a} marcação(ões) desconsiderada(s) por ajuste aprovado.", "Portaria MTP 671/2021, art. 83"),
            CodigoRegra.AjustePendenteIgnorado => ($"{a} ajuste(s) aguardando aprovação ainda não entram no cálculo.", null),
            CodigoRegra.MarcacoesImpares => ($"{a} marcação(ões) no dia: número ímpar, falta uma entrada ou saída.", null),
            CodigoRegra.DiaProvisorio => ("Resultado provisório: nada é lançado no banco de horas até o dia ser corrigido.", null),
            _ => (regra.Codigo.ToString(), (string?)null)
        };

        return new RegraDto(regra.Codigo.ToString(), texto, fundamento);
    }

    public static string Inconsistencia(Inconsistencia inconsistencia) => inconsistencia switch
    {
        Domain.Apuracao.Inconsistencia.MarcacoesImpares => "Marcações ímpares",
        Domain.Apuracao.Inconsistencia.AjustePendente => "Ajuste pendente",
        Domain.Apuracao.Inconsistencia.MarcacaoDuplicada => "Marcação duplicada",
        Domain.Apuracao.Inconsistencia.IntervaloIrregular => "Intervalo irregular",
        Domain.Apuracao.Inconsistencia.InterjornadaIrregular => "Interjornada irregular",
        Domain.Apuracao.Inconsistencia.HeAcimaDoLimite => "Hora extra acima do limite",
        Domain.Apuracao.Inconsistencia.ParSuspeito => "Par de marcações suspeito",
        _ => inconsistencia.ToString()
    };
}
