using PeopleFlow.Domain.Feriados;

namespace PeopleFlow.Infrastructure.Persistence.Seed;

public static class FeriadosCatalogo
{
    public static DateOnly Pascoa(int ano)
    {
        var a = ano % 19;
        var b = ano / 100;
        var c = ano % 100;
        var d = b / 4;
        var e = b % 4;
        var f = (b + 8) / 25;
        var g = (b - f + 1) / 3;
        var h = (19 * a + b - d - g + 15) % 30;
        var i = c / 4;
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = (a + 11 * h + 22 * l) / 451;
        var mes = (h + l - 7 * m + 114) / 31;
        var dia = (h + l - 7 * m + 114) % 31 + 1;
        return new DateOnly(ano, mes, dia);
    }

    public static IEnumerable<Feriado> Nacionais(int ano)
    {
        var pascoa = Pascoa(ano);
        yield return Nacional(new DateOnly(ano, 1, 1), "Confraternização Universal");
        yield return Nacional(pascoa.AddDays(-48), "Carnaval", TipoFeriado.PontoFacultativo);
        yield return Nacional(pascoa.AddDays(-47), "Carnaval", TipoFeriado.PontoFacultativo);
        yield return Nacional(pascoa.AddDays(-2), "Paixão de Cristo");
        yield return Nacional(new DateOnly(ano, 4, 21), "Tiradentes");
        yield return Nacional(new DateOnly(ano, 5, 1), "Dia do Trabalho");
        yield return Nacional(pascoa.AddDays(60), "Corpus Christi", TipoFeriado.PontoFacultativo);
        yield return Nacional(new DateOnly(ano, 9, 7), "Independência do Brasil");
        yield return Nacional(new DateOnly(ano, 10, 12), "Nossa Senhora Aparecida");
        yield return Nacional(new DateOnly(ano, 11, 2), "Finados");
        yield return Nacional(new DateOnly(ano, 11, 15), "Proclamação da República");
        yield return Nacional(new DateOnly(ano, 11, 20), "Dia Nacional de Zumbi e da Consciência Negra");
        yield return Nacional(new DateOnly(ano, 12, 25), "Natal");
    }

    public static IEnumerable<Feriado> RegionaisDemo(int ano)
    {
        var pascoa = Pascoa(ano);
        yield return new Feriado { Data = new DateOnly(ano, 7, 9), Nome = "Revolução Constitucionalista", Abrangencia = AbrangenciaFeriado.Estadual, Uf = "SP" };
        yield return new Feriado { Data = new DateOnly(ano, 1, 25), Nome = "Aniversário de São Paulo", Abrangencia = AbrangenciaFeriado.Municipal, Uf = "SP", Municipio = "São Paulo" };
        yield return new Feriado { Data = pascoa.AddDays(60), Nome = "Corpus Christi", Abrangencia = AbrangenciaFeriado.Municipal, Uf = "SP", Municipio = "São Paulo" };
        yield return new Feriado { Data = pascoa.AddDays(60), Nome = "Corpus Christi", Abrangencia = AbrangenciaFeriado.Municipal, Uf = "SP", Municipio = "Campinas" };
        yield return new Feriado { Data = new DateOnly(ano, 12, 8), Nome = "Nossa Senhora da Conceição", Abrangencia = AbrangenciaFeriado.Municipal, Uf = "SP", Municipio = "Campinas" };
    }

    private static Feriado Nacional(DateOnly data, string nome, TipoFeriado tipo = TipoFeriado.Feriado) =>
        new() { Data = data, Nome = nome, Abrangencia = AbrangenciaFeriado.Nacional, Tipo = tipo };
}
