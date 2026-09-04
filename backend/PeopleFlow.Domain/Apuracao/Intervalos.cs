namespace PeopleFlow.Domain.Apuracao;

public static class Intervalos
{
    public static List<Intervalo> Normalizar(IEnumerable<Intervalo> intervalos)
    {
        var ordenados = intervalos.Where(i => i.Fim > i.Inicio).OrderBy(i => i.Inicio).ToList();
        var resultado = new List<Intervalo>();
        foreach (var atual in ordenados)
        {
            if (resultado.Count > 0 && atual.Inicio <= resultado[^1].Fim)
            {
                var ultimo = resultado[^1];
                resultado[^1] = ultimo with { Fim = atual.Fim > ultimo.Fim ? atual.Fim : ultimo.Fim };
            }
            else
            {
                resultado.Add(atual);
            }
        }

        return resultado;
    }

    public static List<Intervalo> Subtrair(IEnumerable<Intervalo> origem, IEnumerable<Intervalo> remover)
    {
        var cortes = Normalizar(remover);
        var resultado = new List<Intervalo>();
        foreach (var intervalo in Normalizar(origem))
        {
            var pedacos = new List<Intervalo> { intervalo };
            foreach (var corte in cortes)
            {
                var proximos = new List<Intervalo>();
                foreach (var pedaco in pedacos)
                {
                    if (corte.Fim <= pedaco.Inicio || corte.Inicio >= pedaco.Fim)
                    {
                        proximos.Add(pedaco);
                        continue;
                    }

                    if (corte.Inicio > pedaco.Inicio)
                    {
                        proximos.Add(new Intervalo(pedaco.Inicio, corte.Inicio));
                    }

                    if (corte.Fim < pedaco.Fim)
                    {
                        proximos.Add(new Intervalo(corte.Fim, pedaco.Fim));
                    }
                }

                pedacos = proximos;
            }

            resultado.AddRange(pedacos);
        }

        return Normalizar(resultado);
    }

    public static List<Intervalo> Intersectar(IEnumerable<Intervalo> a, IEnumerable<Intervalo> b)
    {
        var listaB = Normalizar(b);
        var resultado = new List<Intervalo>();
        foreach (var x in Normalizar(a))
        {
            foreach (var y in listaB)
            {
                var inicio = x.Inicio > y.Inicio ? x.Inicio : y.Inicio;
                var fim = x.Fim < y.Fim ? x.Fim : y.Fim;
                if (fim > inicio)
                {
                    resultado.Add(new Intervalo(inicio, fim));
                }
            }
        }

        return Normalizar(resultado);
    }

    public static int Total(IEnumerable<Intervalo> intervalos) => intervalos.Sum(i => i.Minutos);
}
