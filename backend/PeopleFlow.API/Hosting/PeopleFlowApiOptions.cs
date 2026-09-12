using PeopleFlow.Infrastructure;

namespace PeopleFlow.API.Hosting;

public sealed class PeopleFlowApiOptions
{
    public const string ExtraOriginsVariable = "PEOPLEFLOW_EXTRA_ORIGINS";

    public required PeopleFlowPaths Paths { get; init; }
    public required IReadOnlyList<string> AllowedOrigins { get; init; }
    public string? WebRootDirectory { get; init; }
    public bool ConsoleLogging { get; init; } = true;

    public bool HasWebRoot => WebRootDirectory is not null && File.Exists(Path.Combine(WebRootDirectory, "index.html"));

    public static List<string> LocalOrigins(int port, params string[] defaultExtras)
    {
        var origins = new List<string> { $"http://127.0.0.1:{port}", $"http://localhost:{port}" };
        var extras = Environment.GetEnvironmentVariable(ExtraOriginsVariable);
        var list = string.IsNullOrWhiteSpace(extras)
            ? defaultExtras
            : extras.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var origin in list)
        {
            var normalized = origin.TrimEnd('/');
            if (!origins.Contains(normalized, StringComparer.OrdinalIgnoreCase))
            {
                origins.Add(normalized);
            }
        }

        return origins;
    }
}
