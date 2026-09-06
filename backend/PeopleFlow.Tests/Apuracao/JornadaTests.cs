using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Jornadas;

namespace PeopleFlow.Tests.Apuracao;

public class JornadaTests
{
    private static JornadaDia Dia(int indice, params (string Entrada, string Saida)[] periodos) => new()
    {
        Indice = indice,
        Folga = periodos.Length == 0,
        Periodos = periodos.Select((p, i) => new JornadaPeriodo { Ordem = i, Entrada = TimeOnly.Parse(p.Entrada), Saida = TimeOnly.Parse(p.Saida) }).ToList()
    };

    private static Jornada Comercial44() => new()
    {
        Tipo = TipoJornada.Semanal,
        Dias =
        [
            Dia(0),
            Dia(1, ("08:00", "12:00"), ("13:00", "18:00")),
            Dia(2, ("08:00", "12:00"), ("13:00", "18:00")),
            Dia(3, ("08:00", "12:00"), ("13:00", "18:00")),
            Dia(4, ("08:00", "12:00"), ("13:00", "18:00")),
            Dia(5, ("08:00", "12:00"), ("13:00", "17:00")),
            Dia(6)
        ]
    };

    private static Jornada Noturna12x36() => new()
    {
        Tipo = TipoJornada.Ciclica,
        HoraVirada = new TimeOnly(12, 0),
        FeriadosCompensados = true,
        Dias = [Dia(0, ("19:00", "01:00"), ("02:00", "07:00")), Dia(1)]
    };

    [Fact]
    public void Semanal_usa_o_dia_da_semana_e_sexta_e_mais_curta()
    {
        var jornada = Comercial44();

        var segunda = ResolvedorJornada.Prever(jornada, null, new DateOnly(2026, 9, 14));
        var sexta = ResolvedorJornada.Prever(jornada, null, new DateOnly(2026, 9, 18));
        var sabado = ResolvedorJornada.Prever(jornada, null, new DateOnly(2026, 9, 19));

        Assert.Equal(540, Intervalos.Total(segunda));
        Assert.Equal(480, Intervalos.Total(sexta));
        Assert.Empty(sabado);
        Assert.Equal(2640, jornada.CargaCicloMinutos);
    }

    [Fact]
    public void Ciclo_12x36_alterna_a_partir_da_ancora()
    {
        var jornada = Noturna12x36();
        var equipeA = new DateOnly(2026, 9, 1);
        var equipeB = new DateOnly(2026, 9, 2);

        Assert.NotEmpty(ResolvedorJornada.Prever(jornada, equipeA, new DateOnly(2026, 9, 1)));
        Assert.Empty(ResolvedorJornada.Prever(jornada, equipeA, new DateOnly(2026, 9, 2)));
        Assert.NotEmpty(ResolvedorJornada.Prever(jornada, equipeA, new DateOnly(2026, 9, 3)));
        Assert.Empty(ResolvedorJornada.Prever(jornada, equipeB, new DateOnly(2026, 9, 1)));
        Assert.NotEmpty(ResolvedorJornada.Prever(jornada, equipeB, new DateOnly(2026, 9, 2)));
        Assert.NotEmpty(ResolvedorJornada.Prever(jornada, equipeA, new DateOnly(2026, 8, 30)));
    }

    [Fact]
    public void Periodos_que_viram_a_meia_noite_terminam_no_dia_seguinte()
    {
        var previsto = ResolvedorJornada.Prever(Noturna12x36(), new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 1));

        Assert.Equal(new DateTime(2026, 9, 1, 19, 0, 0), previsto[0].Inicio);
        Assert.Equal(new DateTime(2026, 9, 2, 1, 0, 0), previsto[0].Fim);
        Assert.Equal(new DateTime(2026, 9, 2, 2, 0, 0), previsto[1].Inicio);
        Assert.Equal(new DateTime(2026, 9, 2, 7, 0, 0), previsto[1].Fim);
    }

    [Fact]
    public void Validacao_recusa_virada_dentro_do_periodo()
    {
        var jornada = Noturna12x36();
        jornada.HoraVirada = new TimeOnly(4, 0);

        var erros = ResolvedorJornada.Validar(jornada);

        Assert.Contains(erros, e => e.Contains("hora de virada"));
    }

    [Fact]
    public void Validacao_aceita_jornadas_bem_formadas()
    {
        Assert.Empty(ResolvedorJornada.Validar(Comercial44()));
        Assert.Empty(ResolvedorJornada.Validar(Noturna12x36()));
    }

    [Fact]
    public void Distribuidor_com_virada_ao_meio_dia_leva_a_madrugada_para_o_dia_anterior()
    {
        var virada = new TimeOnly(12, 0);

        var entrada = DistribuidorMarcacoes.DiaDeReferencia(new DateTime(2026, 9, 1, 19, 0, 0), _ => virada);
        var saida = DistribuidorMarcacoes.DiaDeReferencia(new DateTime(2026, 9, 2, 7, 0, 0), _ => virada);

        Assert.Equal(new DateOnly(2026, 9, 1), entrada);
        Assert.Equal(new DateOnly(2026, 9, 1), saida);
    }

    [Fact]
    public void Distribuidor_com_virada_as_4_mantem_saida_de_madrugada_no_dia_anterior()
    {
        var virada = new TimeOnly(4, 0);

        var saida = DistribuidorMarcacoes.DiaDeReferencia(new DateTime(2026, 9, 2, 1, 30, 0), _ => virada);
        var entrada = DistribuidorMarcacoes.DiaDeReferencia(new DateTime(2026, 9, 2, 8, 0, 0), _ => virada);

        Assert.Equal(new DateOnly(2026, 9, 1), saida);
        Assert.Equal(new DateOnly(2026, 9, 2), entrada);
    }

    [Fact]
    public void Distribuidor_agrupa_por_dia_respeitando_troca_de_virada()
    {
        var marcacoes = new[]
        {
            new DateTime(2026, 9, 1, 8, 0, 0),
            new DateTime(2026, 9, 1, 17, 0, 0),
            new DateTime(2026, 9, 2, 3, 0, 0),
            new DateTime(2026, 9, 2, 19, 0, 0)
        };

        var dias = DistribuidorMarcacoes.Distribuir(marcacoes, m => m, dia => dia.Day == 1 ? new TimeOnly(4, 0) : new TimeOnly(12, 0));

        Assert.Equal(3, dias[new DateOnly(2026, 9, 1)].Count);
        Assert.Single(dias[new DateOnly(2026, 9, 2)]);
        Assert.False(dias.ContainsKey(new DateOnly(2026, 8, 31)));
    }
}
