using PeopleFlow.Domain.Apuracao;
using static PeopleFlow.Tests.Apuracao.Cenario;

namespace PeopleFlow.Tests.Apuracao;

public class ToleranciaTests
{
    [Fact]
    public void Exemplo_da_ideia_conta_49_minutos_extras_no_banco()
    {
        var r = Apurar(Administrativo, Marcacoes("07:58", "12:00", "13:30", "18:47"));

        Assert.Equal(TipoDia.Util, r.TipoDia);
        Assert.Equal(SituacaoDia.Normal, r.Situacao);
        Assert.Equal(510, r.PrevistoMinutos);
        Assert.Equal(559, r.TrabalhadoMinutos);
        Assert.Equal(49, r.ExtrasMinutos);
        Assert.Equal(50, r.ExtrasPercentual);
        Assert.Equal(0, r.AtrasoMinutos);
        Assert.Equal(0, r.SaidaAntecipadaMinutos);
        Assert.Equal(0, r.NoturnoRealMinutos);
        Assert.Equal(90, r.IntervaloRealMinutos);
        Assert.Equal(49, r.SaldoMinutos);
        Assert.Equal(49, r.CreditoBancoMinutos);
        Assert.Equal(0, r.ExtrasAPagarMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.ToleranciaExcedidaPorMarcacao && regra.Valor1 == 47);
        Assert.Empty(r.Inconsistencias);
    }

    [Fact]
    public void Exemplo_da_ideia_com_pagamento_nao_vai_para_o_banco()
    {
        var parametros = ParametrosApuracao.Padrao with { DestinoHoraExtra = DestinoHoraExtra.Pagamento };

        var r = Apurar(Administrativo, Marcacoes("07:58", "12:00", "13:30", "18:47"), parametros);

        Assert.Equal(49, r.ExtrasAPagarMinutos);
        Assert.Equal(0, r.CreditoBancoMinutos);
    }

    [Fact]
    public void Exemplo_da_ideia_descontando_por_marcacao_conta_47()
    {
        var parametros = ParametrosApuracao.Padrao with { ModoTolerancia = ModoTolerancia.DescontarPorMarcacao };

        var r = Apurar(Administrativo, Marcacoes("07:58", "12:00", "13:30", "18:47"), parametros);

        Assert.Equal(47, r.ExtrasMinutos);
        Assert.Equal(2, r.ToleranciaDesconsideradaMinutos);
    }

    [Fact]
    public void Variacoes_pequenas_dentro_do_limite_diario_sao_toleradas()
    {
        var r = Apurar(Administrativo, Marcacoes("07:57", "12:02", "13:29", "18:03"));

        Assert.Equal(0, r.ExtrasMinutos);
        Assert.Equal(0, r.SaldoMinutos);
        Assert.Equal(9, r.ToleranciaDesconsideradaMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.ToleranciaAplicada);
    }

    [Fact]
    public void Soma_acima_de_dez_minutos_conta_a_totalidade_no_modo_integral()
    {
        var r = Apurar(Administrativo, Marcacoes("07:55", "12:04", "13:26", "18:00"));

        Assert.Equal(13, r.ExtrasMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.ToleranciaExcedidaDiaria && regra.Valor1 == 13);
    }

    [Fact]
    public void Soma_acima_de_dez_minutos_descontando_por_marcacao_mantem_so_o_excedente()
    {
        var parametros = ParametrosApuracao.Padrao with { ModoTolerancia = ModoTolerancia.DescontarPorMarcacao };

        var r = Apurar(Administrativo, Marcacoes("07:55", "12:04", "13:26", "18:00"), parametros);

        Assert.Equal(4, r.ExtrasMinutos);
        Assert.Equal(9, r.ToleranciaDesconsideradaMinutos);
    }

    [Fact]
    public void Atraso_de_quatro_minutos_e_tolerado()
    {
        var r = Apurar(Administrativo, Marcacoes("08:04", "12:00", "13:30", "18:00"));

        Assert.Equal(0, r.AtrasoMinutos);
        Assert.Equal(0, r.SaldoMinutos);
    }

    [Fact]
    public void Atraso_de_doze_minutos_debita_do_banco()
    {
        var r = Apurar(Administrativo, Marcacoes("08:12", "12:00", "13:30", "18:00"));

        Assert.Equal(12, r.AtrasoMinutos);
        Assert.Equal(-12, r.SaldoMinutos);
        Assert.Equal(12, r.DebitoBancoMinutos);
        Assert.Equal(SituacaoDia.Normal, r.Situacao);
    }

    [Fact]
    public void Atraso_e_extra_no_mesmo_dia_compensam_no_banco()
    {
        var r = Apurar(Administrativo, Marcacoes("08:07", "12:00", "13:30", "18:20"));

        Assert.Equal(7, r.AtrasoMinutos);
        Assert.Equal(20, r.ExtrasMinutos);
        Assert.Equal(13, r.SaldoMinutos);
        Assert.Equal(20, r.CreditoBancoMinutos);
        Assert.Equal(7, r.DebitoBancoMinutos);
    }

    [Fact]
    public void Atraso_e_extra_no_pagamento_nao_se_compensam()
    {
        var parametros = ParametrosApuracao.Padrao with { DestinoHoraExtra = DestinoHoraExtra.Pagamento };

        var r = Apurar(Administrativo, Marcacoes("08:07", "12:00", "13:30", "18:20"), parametros);

        Assert.Equal(20, r.ExtrasAPagarMinutos);
        Assert.Equal(7, r.DescontoMinutos);
    }

    [Fact]
    public void Saida_antecipada_e_classificada()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30", "17:30"));

        Assert.Equal(30, r.SaidaAntecipadaMinutos);
        Assert.Equal(-30, r.SaldoMinutos);
    }

    [Fact]
    public void Volta_antecipada_do_almoco_conta_como_extra_sem_irregularidade()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:00", "18:00"));

        Assert.Equal(30, r.ExtrasMinutos);
        Assert.Equal(60, r.IntervaloRealMinutos);
        Assert.DoesNotContain(Inconsistencia.IntervaloIrregular, r.Inconsistencias);
    }

    [Fact]
    public void Saida_no_meio_do_expediente_e_ausencia_parcial()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "10:00", "11:00", "12:00", "13:30", "18:00"));

        Assert.Equal(60, r.AusenciaParcialMinutos);
        Assert.Equal(-60, r.SaldoMinutos);
    }
}
