namespace PeopleFlow.Domain.Apuracao;

public sealed record MovimentoBanco(DateOnly Data, int Minutos, DateOnly? VenceEm);

public sealed record CreditoEmAberto(DateOnly Data, int Minutos, DateOnly? VenceEm);

public sealed record SituacaoBanco(int SaldoMinutos, int VencidoMinutos, int CreditosMinutos, int DebitosMinutos, IReadOnlyList<CreditoEmAberto> CreditosEmAberto);

public static class SaldoBancoHoras
{
    public static SituacaoBanco Calcular(IEnumerable<MovimentoBanco> movimentos, DateOnly hoje)
    {
        var ordenados = movimentos.OrderBy(m => m.Data).ThenByDescending(m => m.Minutos).ToList();
        var fila = new List<CreditoEmAberto>();
        var devedor = 0;

        foreach (var movimento in ordenados)
        {
            if (movimento.Minutos > 0)
            {
                var credito = movimento.Minutos;
                if (devedor > 0)
                {
                    var abatido = Math.Min(devedor, credito);
                    devedor -= abatido;
                    credito -= abatido;
                }

                if (credito > 0)
                {
                    fila.Add(new CreditoEmAberto(movimento.Data, credito, movimento.VenceEm));
                }

                continue;
            }

            var debito = -movimento.Minutos;
            while (debito > 0 && fila.Count > 0)
            {
                var primeiro = fila[0];
                var consumo = Math.Min(debito, primeiro.Minutos);
                debito -= consumo;
                if (consumo == primeiro.Minutos)
                {
                    fila.RemoveAt(0);
                }
                else
                {
                    fila[0] = primeiro with { Minutos = primeiro.Minutos - consumo };
                }
            }

            devedor += debito;
        }

        var vencido = fila.Where(c => c.VenceEm is not null && c.VenceEm < hoje).Sum(c => c.Minutos);
        var saldo = fila.Sum(c => c.Minutos) - devedor;
        var creditos = ordenados.Where(m => m.Minutos > 0).Sum(m => m.Minutos);
        var debitos = -ordenados.Where(m => m.Minutos < 0).Sum(m => m.Minutos);
        return new SituacaoBanco(saldo, vencido, creditos, debitos, fila);
    }
}
