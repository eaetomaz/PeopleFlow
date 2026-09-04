using PeopleFlow.Domain.Jornadas;

namespace PeopleFlow.Domain.Apuracao;

public static class ResolvedorJornada
{
    public static JornadaDia? DiaDaJornada(Jornada jornada, DateOnly? referenciaCiclo, DateOnly data)
    {
        if (jornada.Dias.Count == 0)
        {
            return null;
        }

        if (jornada.Tipo == TipoJornada.Semanal)
        {
            return jornada.Dias.FirstOrDefault(dia => dia.Indice == (int)data.DayOfWeek);
        }

        var ciclo = jornada.Dias.Count;
        var ancora = referenciaCiclo ?? data;
        var indice = ((data.DayNumber - ancora.DayNumber) % ciclo + ciclo) % ciclo;
        return jornada.Dias.FirstOrDefault(dia => dia.Indice == indice);
    }

    public static List<Intervalo> Prever(Jornada jornada, DateOnly? referenciaCiclo, DateOnly data)
    {
        var dia = DiaDaJornada(jornada, referenciaCiclo, data);
        if (dia is null || dia.Folga)
        {
            return [];
        }

        var intervalos = new List<Intervalo>();
        var limite = data.ToDateTime(TimeOnly.MinValue);
        foreach (var periodo in dia.Periodos.OrderBy(p => p.Ordem))
        {
            var inicio = data.ToDateTime(periodo.Entrada);
            while (inicio < limite)
            {
                inicio = inicio.AddDays(1);
            }

            var fim = DateOnly.FromDateTime(inicio).ToDateTime(periodo.Saida);
            if (fim <= inicio)
            {
                fim = fim.AddDays(1);
            }

            intervalos.Add(new Intervalo(inicio, fim));
            limite = fim;
        }

        return intervalos;
    }

    public static IReadOnlyList<string> Validar(Jornada jornada)
    {
        var erros = new List<string>();
        if (jornada.Dias.Count == 0)
        {
            erros.Add("Informe ao menos um dia na jornada.");
            return erros;
        }

        if (jornada.Tipo == TipoJornada.Semanal && jornada.Dias.Count != 7)
        {
            erros.Add("A jornada semanal precisa ter os 7 dias da semana.");
        }

        if (jornada.Dias.All(dia => dia.Folga || dia.Periodos.Count == 0))
        {
            erros.Add("A jornada precisa ter ao menos um dia com horário de trabalho.");
        }

        var referencia = new DateOnly(2026, 1, 4);
        foreach (var dia in jornada.Dias.Where(d => !d.Folga && d.Periodos.Count > 0))
        {
            var data = referencia.AddDays(dia.Indice);
            var previsto = Prever(jornada, jornada.Tipo == TipoJornada.Ciclica ? referencia : null, data);
            var total = Intervalos.Total(previsto);
            if (total > 24 * 60)
            {
                erros.Add($"O dia {dia.Indice + 1} passa de 24 horas de trabalho.");
            }

            if (previsto.Count > 0)
            {
                var corteDia = data.ToDateTime(jornada.HoraVirada);
                var corteSeguinte = corteDia.AddDays(1);
                if (previsto.Any(i => (i.Inicio < corteDia && i.Fim > corteDia) || (i.Inicio < corteSeguinte && i.Fim > corteSeguinte)))
                {
                    erros.Add($"A hora de virada ({jornada.HoraVirada:HH\\:mm}) cai dentro de um período de trabalho do dia {dia.Indice + 1}. Escolha outra hora de virada.");
                }
                else if (previsto[0].Inicio < corteDia)
                {
                    erros.Add($"O primeiro período do dia {dia.Indice + 1} começa antes da hora de virada ({jornada.HoraVirada:HH\\:mm}).");
                }
            }
        }

        return erros.Distinct().ToList();
    }
}
