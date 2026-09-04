using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.Domain.Apuracao;

public static class MotorApuracao
{
    public const int Versao = 1;

    private const int ParSuspeitoMinutos = 16 * 60;
    private const int IntervaloMaximoEntreBlocosMinutos = 120;
    private const int JornadaComIntervaloLongoMinutos = 6 * 60;
    private const int JornadaComIntervaloCurtoMinutos = 4 * 60;

    public static ApuracaoDia Apurar(EntradaApuracaoDia entrada)
    {
        var p = entrada.Parametros;
        var resultado = new ApuracaoDia { Data = entrada.Data };

        var validas = FiltrarValidas(entrada.Marcacoes, resultado);
        var trabalhado = Parear(validas, p, resultado);

        var previsto = Intervalos.Normalizar(entrada.Previsto);
        resultado.PrevistoIntervalos.AddRange(previsto);
        resultado.TipoDia = ClassificarDia(entrada, previsto, resultado);

        var previstoEfetivo = resultado.TipoDia == TipoDia.Util
            ? Intervalos.Subtrair(previsto, entrada.Abonos ?? [])
            : [];

        resultado.PrevistoMinutos = Intervalos.Total(previstoEfetivo);
        resultado.TrabalhadoMinutos = Intervalos.Total(trabalhado);

        var noturno = JanelaNoturna(entrada.Data, trabalhado, p, resultado);

        List<Intervalo> extras;
        if (resultado.TipoDia == TipoDia.Util)
        {
            extras = ApurarDiaUtil(trabalhado, previstoEfetivo, validas.Count, p, resultado);
        }
        else
        {
            extras = trabalhado;
            resultado.Segmentos.AddRange(extras.Select(i => new Segmento(i.Inicio, i.Fim, ClasseSegmento.Extra)));
        }

        CalcularNoturnoEExtras(trabalhado, extras, noturno, p, resultado);
        VerificarIntervalo(trabalhado, p, resultado);
        VerificarInterjornada(trabalhado, entrada.UltimaSaidaAnterior, p, resultado);
        DefinirDestino(p, resultado);
        DefinirSituacao(trabalhado, resultado);

        resultado.Segmentos.Sort((a, b) => a.Inicio.CompareTo(b.Inicio));
        return resultado;
    }

    private static List<DateTime> FiltrarValidas(IReadOnlyList<MarcacaoApurada> marcacoes, ApuracaoDia resultado)
    {
        var desconsideradas = marcacoes
            .Where(m => m is { Origem: OrigemMarcacao.AjusteManual, StatusAjuste: StatusAjuste.Aprovado, TipoAjuste: TipoAjuste.Desconsideracao, MarcacaoAlvoId: not null })
            .Select(m => m.MarcacaoAlvoId!.Value)
            .ToHashSet();

        var pendentes = marcacoes.Count(m => m is { Origem: OrigemMarcacao.AjusteManual, StatusAjuste: StatusAjuste.Pendente });
        if (pendentes > 0)
        {
            resultado.Inconsistencias.Add(Inconsistencia.AjustePendente);
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.AjustePendenteIgnorado, pendentes));
        }

        if (desconsideradas.Count > 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.MarcacaoDesconsiderada, desconsideradas.Count(id => marcacoes.Any(m => m.Id == id))));
        }

        return marcacoes
            .Where(m => m.Origem == OrigemMarcacao.Registro
                || m is { Origem: OrigemMarcacao.AjusteManual, StatusAjuste: StatusAjuste.Aprovado, TipoAjuste: TipoAjuste.Inclusao })
            .Where(m => !desconsideradas.Contains(m.Id))
            .Select(m => Truncar(m.DataHora))
            .OrderBy(d => d)
            .ToList();
    }

    private static List<Intervalo> Parear(List<DateTime> validas, ParametrosApuracao p, ApuracaoDia resultado)
    {
        var unicas = new List<DateTime>();
        var duplicadas = 0;
        foreach (var marcacao in validas)
        {
            if (unicas.Count > 0 && (marcacao - unicas[^1]).TotalMinutes < Math.Max(1, p.JanelaDuplicidadeMinutos))
            {
                duplicadas++;
                continue;
            }

            unicas.Add(marcacao);
        }

        if (duplicadas > 0)
        {
            resultado.Inconsistencias.Add(Inconsistencia.MarcacaoDuplicada);
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.MarcacaoDuplicadaIgnorada, duplicadas));
        }

        validas.Clear();
        validas.AddRange(unicas);

        var pares = new List<Intervalo>();
        for (var i = 0; i < unicas.Count; i += 2)
        {
            if (i + 1 >= unicas.Count)
            {
                resultado.Pares.Add(new ParMarcacao(unicas[i], null));
                resultado.Inconsistencias.Add(Inconsistencia.MarcacoesImpares);
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.MarcacoesImpares, unicas.Count));
                break;
            }

            var par = new Intervalo(unicas[i], unicas[i + 1]);
            resultado.Pares.Add(new ParMarcacao(par.Inicio, par.Fim));
            if (par.Minutos > ParSuspeitoMinutos && !resultado.Inconsistencias.Contains(Inconsistencia.ParSuspeito))
            {
                resultado.Inconsistencias.Add(Inconsistencia.ParSuspeito);
            }

            pares.Add(par);
        }

        return Intervalos.Normalizar(pares);
    }

    private static TipoDia ClassificarDia(EntradaApuracaoDia entrada, List<Intervalo> previsto, ApuracaoDia resultado)
    {
        if (entrada.Feriado && !entrada.FeriadosCompensados)
        {
            if (previsto.Count > 0)
            {
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.FeriadoAbonado, Intervalos.Total(previsto)));
            }

            return TipoDia.Feriado;
        }

        if (entrada.Feriado && previsto.Count > 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.FeriadoCompensadoPelaEscala));
        }

        if (previsto.Count == 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.DiaDeDescanso));
            return TipoDia.Descanso;
        }

        return TipoDia.Util;
    }

    private static List<Intervalo> ApurarDiaUtil(List<Intervalo> trabalhado, List<Intervalo> previsto, int marcacoesValidas, ParametrosApuracao p, ApuracaoDia resultado)
    {
        if (marcacoesValidas == 0)
        {
            resultado.FaltaMinutos = Intervalos.Total(previsto);
            if (resultado.FaltaMinutos > 0)
            {
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.Falta, resultado.FaltaMinutos));
                resultado.Segmentos.AddRange(previsto.Select(i => new Segmento(i.Inicio, i.Fim, ClasseSegmento.Falta)));
            }

            return [];
        }

        resultado.Segmentos.AddRange(Intervalos.Intersectar(trabalhado, previsto).Select(i => new Segmento(i.Inicio, i.Fim, ClasseSegmento.Normal)));

        var variacoes = Intervalos.Subtrair(trabalhado, previsto).Select(i => (Intervalo: i, Extra: true))
            .Concat(Intervalos.Subtrair(previsto, trabalhado).Select(i => (Intervalo: i, Extra: false)))
            .OrderBy(v => v.Intervalo.Inicio)
            .ToList();

        var mantidas = AplicarTolerancia(variacoes, p, resultado);

        var extras = new List<Intervalo>();
        foreach (var (intervalo, extra) in mantidas)
        {
            if (extra)
            {
                extras.Add(intervalo);
                resultado.Segmentos.Add(new Segmento(intervalo.Inicio, intervalo.Fim, ClasseSegmento.Extra));
                continue;
            }

            var classe = ClassificarDebito(intervalo, previsto);
            resultado.Segmentos.Add(new Segmento(intervalo.Inicio, intervalo.Fim, classe));
            switch (classe)
            {
                case ClasseSegmento.Atraso:
                    resultado.AtrasoMinutos += intervalo.Minutos;
                    break;
                case ClasseSegmento.SaidaAntecipada:
                    resultado.SaidaAntecipadaMinutos += intervalo.Minutos;
                    break;
                default:
                    resultado.AusenciaParcialMinutos += intervalo.Minutos;
                    break;
            }
        }

        if (resultado.AtrasoMinutos > 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.Atraso, resultado.AtrasoMinutos));
        }

        if (resultado.SaidaAntecipadaMinutos > 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.SaidaAntecipada, resultado.SaidaAntecipadaMinutos));
        }

        if (resultado.AusenciaParcialMinutos > 0)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.AusenciaParcial, resultado.AusenciaParcialMinutos));
        }

        return extras;
    }

    private static List<(Intervalo Intervalo, bool Extra)> AplicarTolerancia(List<(Intervalo Intervalo, bool Extra)> variacoes, ParametrosApuracao p, ApuracaoDia resultado)
    {
        if (variacoes.Count == 0)
        {
            return variacoes;
        }

        var toleradas = new List<(Intervalo Intervalo, bool Extra)>();
        var mantidas = new List<(Intervalo Intervalo, bool Extra)>();

        if (p.ModoTolerancia == ModoTolerancia.IntegralAoExceder)
        {
            var maior = variacoes.Max(v => v.Intervalo.Minutos);
            var soma = variacoes.Sum(v => v.Intervalo.Minutos);
            if (maior <= p.ToleranciaPorMarcacaoMinutos && soma <= p.ToleranciaDiariaMinutos)
            {
                toleradas.AddRange(variacoes);
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.ToleranciaAplicada, soma, p.ToleranciaDiariaMinutos));
            }
            else
            {
                mantidas.AddRange(variacoes);
                resultado.Regras.Add(maior > p.ToleranciaPorMarcacaoMinutos
                    ? new RegraAplicada(CodigoRegra.ToleranciaExcedidaPorMarcacao, maior, p.ToleranciaPorMarcacaoMinutos)
                    : new RegraAplicada(CodigoRegra.ToleranciaExcedidaDiaria, soma, p.ToleranciaDiariaMinutos));
            }
        }
        else
        {
            var acumulado = 0;
            foreach (var variacao in variacoes)
            {
                var minutos = variacao.Intervalo.Minutos;
                if (minutos <= p.ToleranciaPorMarcacaoMinutos && acumulado + minutos <= p.ToleranciaDiariaMinutos)
                {
                    acumulado += minutos;
                    toleradas.Add(variacao);
                }
                else
                {
                    mantidas.Add(variacao);
                }
            }

            if (acumulado > 0)
            {
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.ToleranciaDescontadaPorMarcacao, acumulado, mantidas.Sum(v => v.Intervalo.Minutos)));
            }
        }

        resultado.ToleranciaDesconsideradaMinutos = toleradas.Sum(v => v.Intervalo.Minutos);
        resultado.Segmentos.AddRange(toleradas.Select(v => new Segmento(v.Intervalo.Inicio, v.Intervalo.Fim, ClasseSegmento.Tolerado)));
        return mantidas;
    }

    private static ClasseSegmento ClassificarDebito(Intervalo debito, List<Intervalo> previsto)
    {
        foreach (var periodo in previsto)
        {
            if (debito.Inicio < periodo.Inicio || debito.Fim > periodo.Fim)
            {
                continue;
            }

            var comecaNoInicio = debito.Inicio == periodo.Inicio;
            var terminaNoFim = debito.Fim == periodo.Fim;
            if (comecaNoInicio && terminaNoFim)
            {
                return ClasseSegmento.AusenciaParcial;
            }

            if (comecaNoInicio)
            {
                return ClasseSegmento.Atraso;
            }

            if (terminaNoFim)
            {
                return ClasseSegmento.SaidaAntecipada;
            }

            return ClasseSegmento.AusenciaParcial;
        }

        return ClasseSegmento.AusenciaParcial;
    }

    private static List<Intervalo> JanelaNoturna(DateOnly data, List<Intervalo> trabalhado, ParametrosApuracao p, ApuracaoDia resultado)
    {
        var janelas = new List<Intervalo>();
        for (var deslocamento = -1; deslocamento <= 1; deslocamento++)
        {
            var dia = data.AddDays(deslocamento);
            var inicio = dia.ToDateTime(p.InicioNoturno);
            var fim = (p.FimNoturno <= p.InicioNoturno ? dia.AddDays(1) : dia).ToDateTime(p.FimNoturno);
            janelas.Add(new Intervalo(inicio, fim));
        }

        if (!p.ProrrogacaoNoturna || trabalhado.Count == 0)
        {
            return Intervalos.Normalizar(janelas);
        }

        var blocos = new List<Intervalo>();
        foreach (var intervalo in trabalhado)
        {
            if (blocos.Count > 0 && (intervalo.Inicio - blocos[^1].Fim).TotalMinutes <= IntervaloMaximoEntreBlocosMinutos)
            {
                blocos[^1] = blocos[^1] with { Fim = intervalo.Fim };
            }
            else
            {
                blocos.Add(intervalo);
            }
        }

        var prorrogado = 0;
        for (var i = 0; i < janelas.Count; i++)
        {
            foreach (var bloco in blocos)
            {
                if (bloco.Inicio <= janelas[i].Inicio && bloco.Fim > janelas[i].Fim)
                {
                    prorrogado += (int)Math.Round((bloco.Fim - janelas[i].Fim).TotalMinutes);
                    janelas[i] = janelas[i] with { Fim = bloco.Fim };
                }
            }
        }

        if (prorrogado > 0)
        {
            var efetivo = Intervalos.Total(Intervalos.Intersectar(trabalhado, janelas)) - Intervalos.Total(Intervalos.Intersectar(trabalhado, JanelasOriginais(data, p)));
            if (efetivo > 0)
            {
                resultado.Regras.Add(new RegraAplicada(CodigoRegra.ProrrogacaoNoturna, efetivo));
            }
        }

        return Intervalos.Normalizar(janelas);
    }

    private static List<Intervalo> JanelasOriginais(DateOnly data, ParametrosApuracao p)
    {
        var janelas = new List<Intervalo>();
        for (var deslocamento = -1; deslocamento <= 1; deslocamento++)
        {
            var dia = data.AddDays(deslocamento);
            var fim = (p.FimNoturno <= p.InicioNoturno ? dia.AddDays(1) : dia).ToDateTime(p.FimNoturno);
            janelas.Add(new Intervalo(dia.ToDateTime(p.InicioNoturno), fim));
        }

        return janelas;
    }

    private static void CalcularNoturnoEExtras(List<Intervalo> trabalhado, List<Intervalo> extras, List<Intervalo> noturno, ParametrosApuracao p, ApuracaoDia resultado)
    {
        var noturnoTrabalhado = Intervalos.Intersectar(trabalhado, noturno);
        resultado.NoturnoRealMinutos = Intervalos.Total(noturnoTrabalhado);
        resultado.NoturnoFictoMinutos = Ficta(resultado.NoturnoRealMinutos, p);
        resultado.Segmentos.AddRange(noturnoTrabalhado.Select(i => new Segmento(i.Inicio, i.Fim, ClasseSegmento.Noturno)));

        if (resultado.NoturnoRealMinutos > 0 && p.HoraNoturnaReduzida)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.HoraNoturnaReduzida, resultado.NoturnoRealMinutos, resultado.NoturnoFictoMinutos));
        }

        var extrasNoturnasReais = Intervalos.Total(Intervalos.Intersectar(extras, noturno));
        var extrasDiurnas = Intervalos.Total(extras) - extrasNoturnasReais;
        resultado.ExtrasNoturnasMinutos = Ficta(extrasNoturnasReais, p);
        resultado.ExtrasMinutos = extrasDiurnas + resultado.ExtrasNoturnasMinutos;

        if (resultado.ExtrasMinutos == 0)
        {
            return;
        }

        if (resultado.TipoDia == TipoDia.Util)
        {
            resultado.ExtrasPercentual = p.PercentualHeDiaUtil;
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.HoraExtraDiaUtil, resultado.ExtrasMinutos, p.PercentualHeDiaUtil));
        }
        else
        {
            resultado.ExtrasPercentual = p.PercentualHeDescansoFeriado;
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.HoraExtraDescansoFeriado, resultado.ExtrasMinutos, p.PercentualHeDescansoFeriado));
        }

        if (resultado.ExtrasMinutos > p.LimiteDiarioHeMinutos)
        {
            resultado.Inconsistencias.Add(Inconsistencia.HeAcimaDoLimite);
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.LimiteHeExcedido, resultado.ExtrasMinutos, p.LimiteDiarioHeMinutos));
        }
    }

    private static int Ficta(int minutosReais, ParametrosApuracao p) =>
        p.HoraNoturnaReduzida ? (int)Math.Round(minutosReais * 60m / 52.5m, MidpointRounding.AwayFromZero) : minutosReais;

    private static void VerificarIntervalo(List<Intervalo> trabalhado, ParametrosApuracao p, ApuracaoDia resultado)
    {
        var maiorIntervalo = 0;
        for (var i = 1; i < trabalhado.Count; i++)
        {
            maiorIntervalo = Math.Max(maiorIntervalo, (int)Math.Round((trabalhado[i].Inicio - trabalhado[i - 1].Fim).TotalMinutes));
        }

        resultado.IntervaloRealMinutos = maiorIntervalo;

        var minimo = resultado.TrabalhadoMinutos > JornadaComIntervaloLongoMinutos
            ? p.IntervaloMinimoAcima6hMinutos
            : resultado.TrabalhadoMinutos > JornadaComIntervaloCurtoMinutos ? p.IntervaloMinimo4a6hMinutos : 0;

        if (minimo > 0 && maiorIntervalo < minimo)
        {
            resultado.IntervaloSuprimidoMinutos = minimo - maiorIntervalo;
            resultado.Inconsistencias.Add(Inconsistencia.IntervaloIrregular);
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.IntervaloSuprimido, maiorIntervalo, minimo));
        }
    }

    private static void VerificarInterjornada(List<Intervalo> trabalhado, DateTime? ultimaSaidaAnterior, ParametrosApuracao p, ApuracaoDia resultado)
    {
        if (ultimaSaidaAnterior is null || trabalhado.Count == 0)
        {
            return;
        }

        var descanso = (int)Math.Round((trabalhado[0].Inicio - Truncar(ultimaSaidaAnterior.Value)).TotalMinutes);
        if (descanso >= 0 && descanso < p.InterjornadaMinimaMinutos)
        {
            resultado.Inconsistencias.Add(Inconsistencia.InterjornadaIrregular);
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.InterjornadaIrregular, descanso, p.InterjornadaMinimaMinutos));
        }
    }

    private static void DefinirDestino(ParametrosApuracao p, ApuracaoDia resultado)
    {
        resultado.SaldoMinutos = resultado.ExtrasMinutos - resultado.DebitosMinutos;
        resultado.Provisorio = resultado.Inconsistencias.Contains(Inconsistencia.MarcacoesImpares)
            || resultado.Inconsistencias.Contains(Inconsistencia.AjustePendente);

        if (resultado.Provisorio)
        {
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.DiaProvisorio));
            return;
        }

        if (resultado.ExtrasMinutos == 0 && resultado.DebitosMinutos == 0)
        {
            return;
        }

        var destino = resultado.TipoDia == TipoDia.Util ? p.DestinoHoraExtra : p.DestinoHeDescansoFeriado;
        if (destino == DestinoHoraExtra.BancoDeHoras)
        {
            resultado.CreditoBancoMinutos = resultado.ExtrasMinutos;
            resultado.DebitoBancoMinutos = resultado.DebitosMinutos;
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.DestinoBancoDeHoras, resultado.CreditoBancoMinutos, resultado.DebitoBancoMinutos));
        }
        else
        {
            resultado.ExtrasAPagarMinutos = resultado.ExtrasMinutos;
            resultado.DescontoMinutos = resultado.DebitosMinutos;
            resultado.Regras.Add(new RegraAplicada(CodigoRegra.DestinoPagamento, resultado.ExtrasAPagarMinutos, resultado.DescontoMinutos));
        }
    }

    private static void DefinirSituacao(List<Intervalo> trabalhado, ApuracaoDia resultado)
    {
        resultado.Situacao = resultado.TipoDia switch
        {
            TipoDia.Util when resultado.Provisorio => SituacaoDia.Inconsistente,
            TipoDia.Util when resultado.FaltaMinutos > 0 => SituacaoDia.Falta,
            TipoDia.Util => SituacaoDia.Normal,
            _ when resultado.Provisorio => SituacaoDia.Inconsistente,
            _ when trabalhado.Count > 0 => SituacaoDia.TrabalhoEmDescanso,
            TipoDia.Feriado => SituacaoDia.Feriado,
            _ => SituacaoDia.Descanso
        };
    }

    private static DateTime Truncar(DateTime valor) => new(valor.Year, valor.Month, valor.Day, valor.Hour, valor.Minute, 0, valor.Kind);
}
