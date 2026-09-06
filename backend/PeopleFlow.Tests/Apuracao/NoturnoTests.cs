using PeopleFlow.Domain.Apuracao;
using static PeopleFlow.Tests.Apuracao.Cenario;

namespace PeopleFlow.Tests.Apuracao;

public class NoturnoTests
{
    [Fact]
    public void Jornada_das_22_as_5_tem_480_minutos_fictos()
    {
        var r = Apurar([Periodo("22:00", "05:00")], Marcacoes("22:00", "+05:00"));

        Assert.Equal(420, r.NoturnoRealMinutos);
        Assert.Equal(480, r.NoturnoFictoMinutos);
        Assert.Equal(0, r.ExtrasMinutos);
        Assert.Contains(Inconsistencia.IntervaloIrregular, r.Inconsistencias);
    }

    [Fact]
    public void Prorrogacao_apos_as_5_continua_noturna_e_a_extra_e_ficta()
    {
        var r = Apurar([Periodo("22:00", "05:00")], Marcacoes("22:00", "+06:00"));

        Assert.Equal(480, r.NoturnoRealMinutos);
        Assert.Equal(549, r.NoturnoFictoMinutos);
        Assert.Equal(69, r.ExtrasMinutos);
        Assert.Equal(69, r.ExtrasNoturnasMinutos);
        Assert.Contains(r.Regras, regra => regra.Codigo == CodigoRegra.ProrrogacaoNoturna && regra.Valor1 == 60);
    }

    [Fact]
    public void Escala_12x36_noturna_com_pausa_prorroga_ate_as_7()
    {
        var previsto = new List<Intervalo> { Periodo("19:00", "01:00"), Periodo("02:00", "07:00", 1) };

        var r = Apurar(previsto, Marcacoes("19:00", "+01:00", "+02:00", "+07:00"));

        Assert.Equal(480, r.NoturnoRealMinutos);
        Assert.Equal(549, r.NoturnoFictoMinutos);
        Assert.Equal(0, r.ExtrasMinutos);
        Assert.Equal(660, r.TrabalhadoMinutos);
    }

    [Fact]
    public void Segundo_turno_ate_22h30_tem_30_minutos_noturnos()
    {
        var r = Apurar([Periodo("14:00", "18:00"), Periodo("18:30", "22:30")], Marcacoes("14:00", "18:00", "18:30", "22:30"));

        Assert.Equal(30, r.NoturnoRealMinutos);
        Assert.Equal(34, r.NoturnoFictoMinutos);
    }

    [Fact]
    public void Sem_hora_reduzida_o_ficto_e_igual_ao_real()
    {
        var parametros = ParametrosApuracao.Padrao with { HoraNoturnaReduzida = false };

        var r = Apurar([Periodo("22:00", "05:00")], Marcacoes("22:00", "+05:00"), parametros);

        Assert.Equal(420, r.NoturnoFictoMinutos);
    }

    [Fact]
    public void Sem_prorrogacao_o_noturno_para_as_5()
    {
        var parametros = ParametrosApuracao.Padrao with { ProrrogacaoNoturna = false };

        var r = Apurar([Periodo("22:00", "05:00")], Marcacoes("22:00", "+06:00"), parametros);

        Assert.Equal(420, r.NoturnoRealMinutos);
        Assert.Equal(60, r.ExtrasMinutos);
        Assert.Equal(0, r.ExtrasNoturnasMinutos);
    }

    [Fact]
    public void Jornada_diurna_nao_tem_noturno()
    {
        var r = Apurar(Administrativo, Marcacoes("08:00", "12:00", "13:30", "18:00"));

        Assert.Equal(0, r.NoturnoRealMinutos);
        Assert.DoesNotContain(r.Segmentos, s => s.Classe == ClasseSegmento.Noturno);
    }
}
