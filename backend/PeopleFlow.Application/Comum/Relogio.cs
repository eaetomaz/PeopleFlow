using PeopleFlow.Domain.Empresas;

namespace PeopleFlow.Application.Comum;

public sealed class Relogio(TimeProvider tempo)
{
    public DateTime AgoraUtc => tempo.GetUtcNow().UtcDateTime;

    public DateTime AgoraLocal(Empresa empresa) => AgoraLocal(empresa.FusoHorario);

    public DateTime AgoraLocal(string fuso)
    {
        var agora = TimeZoneInfo.ConvertTimeFromUtc(AgoraUtc, Fuso(fuso));
        return DateTime.SpecifyKind(new DateTime(agora.Year, agora.Month, agora.Day, agora.Hour, agora.Minute, 0), DateTimeKind.Unspecified);
    }

    public DateOnly Hoje(Empresa empresa) => DateOnly.FromDateTime(AgoraLocal(empresa));

    public DateOnly HojePadrao => DateOnly.FromDateTime(AgoraLocal(Empresa.FusoPadrao));

    private static TimeZoneInfo Fuso(string id)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Local;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Local;
        }
    }
}

public static class Competencia
{
    public static (DateOnly Inicio, DateOnly Fim) Intervalo(string? competencia, DateOnly hoje)
    {
        if (!string.IsNullOrWhiteSpace(competencia)
            && DateOnly.TryParseExact($"{competencia}-01", "yyyy-MM-dd", out var inicio))
        {
            return (inicio, inicio.AddMonths(1).AddDays(-1));
        }

        var atual = new DateOnly(hoje.Year, hoje.Month, 1);
        return (atual, atual.AddMonths(1).AddDays(-1));
    }

    public static string Formatar(DateOnly data) => $"{data:yyyy-MM}";
}
