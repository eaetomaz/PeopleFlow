namespace PeopleFlow.Domain.Apuracao;

public static class DistribuidorMarcacoes
{
    public static DateOnly DiaDeReferencia(DateTime marcacao, Func<DateOnly, TimeOnly> horaVirada)
    {
        var dia = DateOnly.FromDateTime(marcacao);
        return marcacao < dia.ToDateTime(horaVirada(dia)) ? dia.AddDays(-1) : dia;
    }

    public static Dictionary<DateOnly, List<T>> Distribuir<T>(IEnumerable<T> marcacoes, Func<T, DateTime> dataHora, Func<DateOnly, TimeOnly> horaVirada)
    {
        var resultado = new Dictionary<DateOnly, List<T>>();
        foreach (var marcacao in marcacoes)
        {
            var dia = DiaDeReferencia(dataHora(marcacao), horaVirada);
            if (!resultado.TryGetValue(dia, out var lista))
            {
                lista = [];
                resultado[dia] = lista;
            }

            lista.Add(marcacao);
        }

        return resultado;
    }
}
