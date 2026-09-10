namespace PeopleFlow.Infrastructure;

public sealed class PeopleFlowPaths
{
    public const string DataDirectoryVariable = "PEOPLEFLOW_DATA_DIR";
    public const string ProductionFolder = "PeopleFlow";
    public const string DevelopmentFolder = "PeopleFlow-dev";

    public PeopleFlowPaths(string? baseDirectory = null, string defaultFolder = ProductionFolder)
    {
        var chosen = baseDirectory;
        if (string.IsNullOrWhiteSpace(chosen))
        {
            chosen = Environment.GetEnvironmentVariable(DataDirectoryVariable);
        }

        if (string.IsNullOrWhiteSpace(chosen))
        {
            chosen = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), defaultFolder);
        }

        Base = Path.GetFullPath(chosen);
        Database = Path.Combine(Base, "peopleflow.db");
        Logs = Path.Combine(Base, "logs");
        Backups = Path.Combine(Base, "backups");
        Keys = Path.Combine(Base, "chaves");
        WebView = Path.Combine(Base, "webview");

        Directory.CreateDirectory(Base);
        Directory.CreateDirectory(Logs);
        Directory.CreateDirectory(Backups);
        Directory.CreateDirectory(Keys);
    }

    public string Base { get; }

    public string Database { get; }

    public string Logs { get; }

    public string Backups { get; }

    public string Keys { get; }

    public string WebView { get; }

    public string ConnectionString => $"Data Source={Database};Cache=Shared;Foreign Keys=True";
}
