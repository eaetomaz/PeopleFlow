using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Ponto;
using static PeopleFlow.Tests.Apuracao.Cenario;

namespace PeopleFlow.Tests.Apuracao;

public class ConsistenciaTests
{
    [Fact]
    public void Marcacoes_impares_deixam_o_dia_provisorio_sem_lancar_no_banco()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30"));

        Assert.Contains(Inconsistencia.MarcacoesImpares, r.Inconsistencias);
        Assert.Equal(SituacaoDia.Inconsistente, r.Situacao);
        Assert.True(r.Provisorio);
        Assert.Equal(0, r.CreditoBancoMinutos);
        Assert.Equal(0, r.DebitoBancoMinutos);
        Assert.Null(r.Pares[^1].Saida);
    }

    [Fact]
    public void Ajuste_pendente_nao_entra_no_calculo()
    {
        var marcacoes = Marcacoes("08:00", "12:00", "13:30");
        marcacoes.Add(Ajuste(Em("18:00"), StatusAjuste.Pendente));

        var r = Apurar(Administrativo, marcacoes);

        Assert.Contains(Inconsistencia.AjustePendente, r.Inconsistencias);
        Assert.Contains(Inconsistencia.MarcacoesImpares, r.Inconsistencias);
        Assert.True(r.Provisorio);
    }

    [Fact]
    public void Ajuste_aprovado_de_inclusao_completa_o_dia()
    {
        var marcacoes = Marcacoes("08:00", "12:00", "13:30");
        marcacoes.Add(Ajuste(Em("18:00"), StatusAjuste.Aprovado));

        var r = Apurar(Administrativo, marcacoes);

        Assert.Empty(r.Inconsistencias);
        Assert.Equal(SituacaoDia.Normal, r.Situacao);
        Assert.Equal(0, r.SaldoMinutos);
    }

    [Fact]
    public void Ajuste_rejeitado_e_ignorado_sem_pendencia()
    {
        var marcacoes = Marcacoes("08:00", "12:00", "13:30", "18:00");
        marcacoes.Add(Ajuste(Em("19:00"), StatusAjuste.Rejeitado));

        var r = Apurar(Administrativo, marcacoes);

        Assert.Empty(r.Inconsistencias);
        Assert.Equal(0, r.SaldoMinutos);
    }

    [Fact]
    public void Marcacoes_duplicadas_no_mesmo_minuto_sao_unidas()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "08:00", "12:00", "13:30", "18:00"));

        Assert.Contains(Inconsistencia.MarcacaoDuplicada, r.Inconsistencias);
        Assert.DoesNotContain(Inconsistencia.MarcacoesImpares, r.Inconsistencias);
        Assert.Equal(0, r.SaldoMinutos);
    }

    [Fact]
    public void Desconsideracao_aprovada_remove_a_marcacao_alvo()
    {
        var marcacoes = Marcacoes("08:00", "10:15", "12:00", "13:30", "18:00");
        var errada = marcacoes[1];
        marcacoes.Add(Ajuste(errada.DataHora, StatusAjuste.Aprovado, TipoAjuste.Desconsideracao, errada.Id));

        var r = Apurar(Administrativo, marcacoes);

        Assert.Empty(r.Inconsistencias);
        Assert.Equal(510, r.TrabalhadoMinutos);
    }

    [Fact]
    public void Intervalo_menor_que_uma_hora_gera_intervalo_suprimido()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "12:30", "17:00"));

        Assert.Contains(Inconsistencia.IntervaloIrregular, r.Inconsistencias);
        Assert.Equal(30, r.IntervaloSuprimidoMinutos);
        Assert.Equal(30, r.IntervaloRealMinutos);
    }

    [Fact]
    public void Jornada_de_cinco_horas_exige_quinze_minutos_de_intervalo()
    {
        var r = Apurar([Periodo("08:00", "13:00")], Marcacoes("08:00", "13:00"));

        Assert.Contains(Inconsistencia.IntervaloIrregular, r.Inconsistencias);
        Assert.Equal(15, r.IntervaloSuprimidoMinutos);
    }

    [Fact]
    public void Descanso_entre_jornadas_menor_que_onze_horas_e_apontado()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30", "18:00"), ultimaSaidaAnterior: Em("23:00", -1));

        Assert.Contains(Inconsistencia.InterjornadaIrregular, r.Inconsistencias);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.InterjornadaIrregular && regra.Valor1 == 540);
    }

    [Fact]
    public void Hora_extra_acima_do_limite_diario_e_apontada_mas_contada()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30", "21:00"));

        Assert.Equal(180, r.ExtrasMinutos);
        Assert.Contains(Inconsistencia.HeAcimaDoLimite, r.Inconsistencias);
        Assert.False(r.Provisorio);
    }

    [Fact]
    public void Par_com_mais_de_dezesseis_horas_e_suspeito()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "+02:00"));

        Assert.Contains(Inconsistencia.ParSuspeito, r.Inconsistencias);
    }
}
