using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;

namespace PeopleFlow.Desktop;

internal static class WebView2Installer
{
    private const string InstallerUrl = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

    public static bool RuntimeAvailable()
    {
        try
        {
            return !string.IsNullOrEmpty(CoreWebView2Environment.GetAvailableBrowserVersionString());
        }
        catch (WebView2RuntimeNotFoundException)
        {
            return false;
        }
    }

    public static async Task<bool> InstallAsync()
    {
        var installer = Path.Combine(Path.GetTempPath(), $"peopleflow-webview2-{Guid.NewGuid():N}.exe");
        try
        {
            using (var http = new HttpClient { Timeout = TimeSpan.FromMinutes(5) })
            using (var response = await http.GetAsync(InstallerUrl, HttpCompletionOption.ResponseHeadersRead))
            {
                response.EnsureSuccessStatusCode();
                await using var target = File.Create(installer);
                await response.Content.CopyToAsync(target);
            }

            var startInfo = new ProcessStartInfo(installer, "/silent /install")
            {
                UseShellExecute = true,
                Verb = "runas"
            };

            using var process = Process.Start(startInfo);
            if (process is null)
            {
                return false;
            }

            await process.WaitForExitAsync();
            return process.ExitCode == 0 && RuntimeAvailable();
        }
        catch (Exception exception) when (exception is Win32Exception or HttpRequestException or IOException or TaskCanceledException)
        {
            return false;
        }
        finally
        {
            try
            {
                File.Delete(installer);
            }
            catch (IOException)
            {
            }
        }
    }
}
