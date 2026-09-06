using PeopleFlow.Domain.Apuracao;
using static PeopleFlow.Tests.Apuracao.Cenario;

namespace PeopleFlow.Tests.Apuracao;

public class BancoHorasTests
{
    [Fact]
    public void Debito_consome_o_credito_mais_antigo_primeiro()
    {
        var movimentos = new[]
        {
            new MovimentoBanco(new DateOnly(2026, 1, 10), 60, new DateOnly(2026, 7, 10)),
            new MovimentoBanco(new DateOnly(2026, 2, 10), 30, new DateOnly(2026, 8, 10)),
            new MovimentoBanco(new DateOnly(2026, 3, 1), -70, null)
        };

        var situacao = SaldoBancoHoras.Calcular(movimentos, new DateOnly(2026, 3, 2));

        Assert.Equal(20, situacao.SaldoMinutos);
        Assert.Single(situacao.CreditosEmAberto);
        Assert.Equal(new DateOnly(2026, 2, 10), situacao.CreditosEmAberto[0].Data);
        Assert.Equal(20, situacao.CreditosEmAberto[0].Minutos);
    }

    [Fact]
    public void Credito_nao_consumido_depois_do_vencimento_aparece_como_vencido()
    {
        var movimentos = new[]
        {
            new MovimentoBanco(new DateOnly(2026, 1, 10), 60, new DateOnly(2026, 7, 10)),
            new MovimentoBanco(new DateOnly(2026, 6, 10), 30, new DateOnly(2026, 12, 10))
        };

        var situacao = SaldoBancoHoras.Calcular(movimentos, new DateOnly(2026, 8, 1));

        Assert.Equal(90, situacao.SaldoMinutos);
        Assert.Equal(60, situacao.VencidoMinutos);
    }

    [Fact]
    public void Debito_sem_credito_deixa_saldo_negativo_que_o_proximo_credito_abate()
    {
        var movimentos = new[]
        {
            new MovimentoBanco(new DateOnly(2026, 1, 5), -40, null),
            new MovimentoBanco(new DateOnly(2026, 1, 6), 30, new DateOnly(2026, 7, 6))
        };

        var situacao = SaldoBancoHoras.Calcular(movimentos, new DateOnly(2026, 1, 7));

        Assert.Equal(-10, situacao.SaldoMinutos);
        Assert.Empty(situacao.CreditosEmAberto);
    }

    [Fact]
    public void Consolidador_soma_o_periodo_e_conta_faltas_e_inconsistencias()
    {
        var dias = new List<ApuracaoDia>
        {
            Apurar(Administrativo, Marcacoes("07:58", "12:00", "13:30", "18:47")),
            Apurar(Administrativo, []),
            Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30"))
        };

        var totais = ConsolidadorPeriodo.Consolidar(dias);

        Assert.Equal(3, totais.Dias);
        Assert.Equal(49, totais.ExtrasMinutos);
        Assert.Equal(510, totais.FaltaMinutos);
        Assert.Equal(1, totais.DiasComFalta);
        Assert.Equal(1, totais.DiasInconsistentes);
        Assert.Equal(49, totais.CreditoBancoMinutos);
        Assert.Equal(510, totais.DebitoBancoMinutos);
    }
}
