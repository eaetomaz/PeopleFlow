using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Hosting;
using PeopleFlow.API.Hosting;
using PeopleFlow.Infrastructure;
using FormsApplication = System.Windows.Forms.Application;

namespace PeopleFlow.Desktop;

internal static class Program
{
    private const int DefaultPort = 5340;
    private const string PortVariable = "PEOPLEFLOW_PORT";
    private const string DevUrlVariable = "PEOPLEFLOW_URL_DEV";
    private const string DevFlagVariable = "PEOPLEFLOW_DEV";

    [STAThread]
    private static int Main(string[] args)
    {
        var consoleMode = args.Contains("--no-window", StringComparer.OrdinalIgnoreCase);
        if (consoleMode)
        {
            NativeMethods.AttachParentConsole();
        }

        var port = ReadPort();
        using var mutex = new Mutex(true, $@"Local\PeopleFlow.{port}", out var firstInstance);
        if (!firstInstance)
        {
            if (consoleMode)
            {
                Console.Error.WriteLine($"Já existe um PeopleFlow usando a porta {port}.");
            }
            else
            {
                NativeMethods.BringWindowToFront(MainForm.WindowTitle);
            }

            return 0;
        }

        ApplicationConfiguration.Initialize();

        PeopleFlowPaths paths;
        try
        {
            paths = new PeopleFlowPaths();
        }
        catch (Exception exception)
        {
            ShowError(consoleMode, $"Não foi possível criar a pasta de dados do PeopleFlow.\n\n{exception.Message}");
            return 1;
        }

        WebApplication? app = null;
        try
        {
            app = CreateHost(args, paths, port, consoleMode);
            app.InitializePeopleFlowDatabaseAsync().GetAwaiter().GetResult();
            app.StartAsync().GetAwaiter().GetResult();
        }
        catch (Exception exception)
        {
            WriteStartupLog(paths, exception);
            var message = IsPortInUse(exception)
                ? $"A porta {port} já está em uso por outro programa. Feche o outro programa e abra o PeopleFlow de novo."
                : $"Não foi possível iniciar o PeopleFlow.\n\n{exception.Message}\n\nDetalhes em {paths.Logs}";
            ShowError(consoleMode, message);
            Stop(app);
            return 1;
        }

        var baseUrl = $"http://127.0.0.1:{port}/";
        try
        {
            if (consoleMode)
            {
                Console.WriteLine($"PeopleFlow em {baseUrl} (dados em {paths.Base}). Ctrl+C para encerrar.");
                app.WaitForShutdown();
            }
            else
            {
                var devUrl = Environment.GetEnvironmentVariable(DevUrlVariable);
                var development = !string.IsNullOrWhiteSpace(devUrl) || Environment.GetEnvironmentVariable(DevFlagVariable) == "1";
                var startUrl = string.IsNullOrWhiteSpace(devUrl) ? baseUrl : devUrl;
                FormsApplication.Run(new MainForm(baseUrl, startUrl, paths.WebView, development));
            }
        }
        finally
        {
            Stop(app);
        }

        return 0;
    }

    private static WebApplication CreateHost(string[] args, PeopleFlowPaths paths, int port, bool consoleMode)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args.Where(arg => !arg.Equals("--no-window", StringComparison.OrdinalIgnoreCase)).ToArray(),
            ContentRootPath = AppContext.BaseDirectory,
            EnvironmentName = Environments.Production
        });

        builder.WebHost.ConfigureKestrel(kestrel => kestrel.ListenLocalhost(port));

        var devOrigins = Environment.GetEnvironmentVariable(DevUrlVariable) is { Length: > 0 } devUrl && Uri.TryCreate(devUrl, UriKind.Absolute, out var devUri)
            ? new[] { devUri.GetLeftPart(UriPartial.Authority) }
            : [];

        var options = new PeopleFlowApiOptions
        {
            Paths = paths,
            AllowedOrigins = PeopleFlowApiOptions.LocalOrigins(port, devOrigins),
            WebRootDirectory = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
            ConsoleLogging = consoleMode
        };

        builder.AddPeopleFlowApi(options);
        var app = builder.Build();
        app.UsePeopleFlowApi(options);
        return app;
    }

    private static int ReadPort() =>
        int.TryParse(Environment.GetEnvironmentVariable(PortVariable), out var port) && port is > 0 and < 65536 ? port : DefaultPort;

    private static bool IsPortInUse(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current.Message.Contains("address already in use", StringComparison.OrdinalIgnoreCase)
                || current is IOException { InnerException: System.Net.Sockets.SocketException { SocketErrorCode: System.Net.Sockets.SocketError.AddressAlreadyInUse } })
            {
                return true;
            }
        }

        return false;
    }

    private static void ShowError(bool consoleMode, string message)
    {
        if (consoleMode)
        {
            Console.Error.WriteLine(message);
        }
        else
        {
            MessageBox.Show(message, MainForm.WindowTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static void WriteStartupLog(PeopleFlowPaths paths, Exception exception)
    {
        try
        {
            File.AppendAllText(
                Path.Combine(paths.Logs, $"peopleflow-startup-{DateTime.Now:yyyyMMdd}.log"),
                $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} Falha ao iniciar o PeopleFlow{Environment.NewLine}{exception}{Environment.NewLine}");
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    private static void Stop(WebApplication? app)
    {
        if (app is not null)
        {
            try
            {
                Task.Run(() => app.StopAsync(TimeSpan.FromSeconds(5))).GetAwaiter().GetResult();
                app.DisposeAsync().AsTask().GetAwaiter().GetResult();
            }
            catch (Exception)
            {
            }
        }

        SqliteConnection.ClearAllPools();
    }
}
