using System.Globalization;

namespace PeopleFlow.Application.Comum;

public static class Documentos
{
    public static string SoDigitos(string? valor) => new((valor ?? string.Empty).Where(char.IsAsciiDigit).ToArray());

    public static bool CnpjValido(string? valor)
    {
        var cnpj = SoDigitos(valor);
        if (cnpj.Length != 14 || cnpj.Distinct().Count() == 1)
        {
            return false;
        }

        int[] pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        int[] pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        return Digito(cnpj, pesos1) == cnpj[12] - '0' && Digito(cnpj, pesos2) == cnpj[13] - '0';
    }

    public static bool CpfValido(string? valor)
    {
        var cpf = SoDigitos(valor);
        if (cpf.Length != 11 || cpf.Distinct().Count() == 1)
        {
            return false;
        }

        int[] pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
        int[] pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
        return Digito(cpf, pesos1) == cpf[9] - '0' && Digito(cpf, pesos2) == cpf[10] - '0';
    }

    private static int Digito(string numero, int[] pesos)
    {
        var soma = 0;
        for (var i = 0; i < pesos.Length; i++)
        {
            soma += (numero[i] - '0') * pesos[i];
        }

        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}

public static class Horario
{
    public static bool Valido(string? valor) =>
        TimeOnly.TryParseExact(valor, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    public static TimeOnly Ler(string valor) => TimeOnly.ParseExact(valor, "HH:mm", CultureInfo.InvariantCulture);

    public static string Formatar(TimeOnly hora) => hora.ToString("HH:mm", CultureInfo.InvariantCulture);
}
