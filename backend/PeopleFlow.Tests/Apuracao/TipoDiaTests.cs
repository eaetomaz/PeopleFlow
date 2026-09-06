using PeopleFlow.Domain.Apuracao;
using static PeopleFlow.Tests.Apuracao.Cenario;

namespace PeopleFlow.Tests.Apuracao;

public class TipoDiaTests
{
    [Fact]
    public void Dia_util_sem_marcacao_e_falta()
    {
        var r = Apurar(Administrativo, []);

        Assert.Equal(SituacaoDia.Falta, r.Situacao);
        Assert.Equal(510, r.FaltaMinutos);
        Assert.Equal(-510, r.SaldoMinutos);
        Assert.Equal(0, r.AtrasoMinutos);
        Assert.Equal(510, r.DebitoBancoMinutos);
    }

    [Fact]
    public void Descanso_trabalhado_e_todo_extra_a_cem_por_cento_e_vai_para_pagamento()
    {
        var r = Apurar([], Marcacoes("08:00", "12:00"));

        Assert.Equal(TipoDia.Descanso, r.TipoDia);
        Assert.Equal(SituacaoDia.TrabalhoEmDescanso, r.Situacao);
        Assert.Equal(240, r.ExtrasMinutos);
        Assert.Equal(100, r.ExtrasPercentual);
        Assert.Equal(240, r.ExtrasAPagarMinutos);
        Assert.Equal(0, r.CreditoBancoMinutos);
        Assert.Contains(Inconsistencia.HeAcimaDoLimite, r.Inconsistencias);
    }

    [Fact]
    public void Descanso_sem_trabalho_nao_gera_nada()
    {
        var r = Apurar([], []);

        Assert.Equal(SituacaoDia.Descanso, r.Situacao);
        Assert.Equal(0, r.SaldoMinutos);
    }

    [Fact]
    public void Feriado_nao_trabalhado_abona_o_previsto()
    {
        var r = Apurar(Administrativo, [], feriado: true);

        Assert.Equal(TipoDia.Feriado, r.TipoDia);
        Assert.Equal(SituacaoDia.Feriado, r.Situacao);
        Assert.Equal(0, r.PrevistoMinutos);
        Assert.Equal(0, r.FaltaMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.FeriadoAbonado && regra.Valor1 == 510);
    }

    [Fact]
    public void Feriado_trabalhado_e_todo_extra_a_cem_por_cento()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "10:00"), feriado: true);

        Assert.Equal(SituacaoDia.TrabalhoEmDescanso, r.Situacao);
        Assert.Equal(120, r.ExtrasMinutos);
        Assert.Equal(100, r.ExtrasPercentual);
    }

    [Fact]
    public void Escala_que_compensa_feriado_trata_o_dia_como_normal()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30", "18:00"), feriado: true, feriadosCompensados: true);

        Assert.Equal(TipoDia.Util, r.TipoDia);
        Assert.Equal(510, r.PrevistoMinutos);
        Assert.Equal(0, r.ExtrasMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.FeriadoCompensadoPelaEscala);
    }
}
