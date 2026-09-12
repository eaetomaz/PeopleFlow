using PeopleFlow.API.Hosting;
using PeopleFlow.Infrastructure;

const int DevelopmentPort = 5341;
const int ViteDevPort = 5195;

var builder = WebApplication.CreateBuilder(args);

var port = DevelopmentPort;
var configuredUrls = builder.Configuration["urls"];
if (string.IsNullOrWhiteSpace(configuredUrls))
{
    builder.WebHost.UseUrls($"http://localhost:{DevelopmentPort}");
}
else if (Uri.TryCreate(configuredUrls.Split(';')[0].Replace("*", "localhost").Replace("+", "localhost"), UriKind.Absolute, out var url))
{
    port = url.Port;
}

var paths = new PeopleFlowPaths(builder.Configuration["PeopleFlow:DataDirectory"], PeopleFlowPaths.DevelopmentFolder);
var options = new PeopleFlowApiOptions
{
    Paths = paths,
    AllowedOrigins = PeopleFlowApiOptions.LocalOrigins(port, $"http://localhost:{ViteDevPort}", $"http://127.0.0.1:{ViteDevPort}"),
    WebRootDirectory = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
    ConsoleLogging = true
};

builder.AddPeopleFlowApi(options);

var app = builder.Build();
app.UsePeopleFlowApi(options);
await app.InitializePeopleFlowDatabaseAsync();
app.Run();

public partial class Program;
