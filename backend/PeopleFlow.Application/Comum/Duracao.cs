namespace PeopleFlow.Application.Comum;

public static class Duracao
{
    public static string Formatar(int minutos)
    {
        var sinal = minutos < 0 ? "-" : string.Empty;
        var absoluto = Math.Abs(minutos);
        return $"{sinal}{absoluto / 60}:{absoluto % 60:00}";
    }

    public static string FormatarComSinal(int minutos) => minutos > 0 ? $"+{Formatar(minutos)}" : Formatar(minutos);
}
