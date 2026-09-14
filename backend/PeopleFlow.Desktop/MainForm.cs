using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;
using FormsApplication = System.Windows.Forms.Application;

namespace PeopleFlow.Desktop;

internal sealed class MainForm : Form
{
    public const string WindowTitle = "PeopleFlow";

    private const string RuntimeDownloadPage = "https://developer.microsoft.com/microsoft-edge/webview2/";

    private static readonly Color DarkBackground = Color.FromArgb(6, 17, 17);
    private static readonly Color LightBackground = Color.FromArgb(244, 248, 247);

    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private readonly string _startUrl;
    private readonly string _userDataFolder;
    private readonly bool _development;
    private readonly HashSet<string> _internalAuthorities;

    public MainForm(string baseUrl, string startUrl, string userDataFolder, bool development)
    {
        _startUrl = startUrl;
        _userDataFolder = userDataFolder;
        _development = development;
        _internalAuthorities = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            new Uri(baseUrl).GetLeftPart(UriPartial.Authority),
            new Uri(startUrl).GetLeftPart(UriPartial.Authority)
        };

        var background = IsDarkTheme() ? DarkBackground : LightBackground;
        Text = WindowTitle;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1360, 860);
        MinimumSize = new Size(1024, 680);
        BackColor = background;
        Icon = Icon.ExtractAssociatedIcon(FormsApplication.ExecutablePath);

        _web.DefaultBackgroundColor = background;
        Controls.Add(_web);

        Load += async (_, _) => await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        if (!WebView2Installer.RuntimeAvailable() && !await EnsureRuntimeAsync())
        {
            Close();
            return;
        }

        var environment = await CoreWebView2Environment.CreateAsync(null, _userDataFolder);
        await _web.EnsureCoreWebView2Async(environment);

        var settings = _web.CoreWebView2.Settings;
        settings.AreDevToolsEnabled = _development;
        settings.AreDefaultContextMenusEnabled = _development;
        settings.IsStatusBarEnabled = false;
        settings.IsPasswordAutosaveEnabled = false;
        settings.IsGeneralAutofillEnabled = false;

        _web.CoreWebView2.NavigationStarting += (_, e) =>
        {
            if (!IsInternal(e.Uri))
            {
                e.Cancel = true;
                OpenExternal(e.Uri);
            }
        };

        _web.CoreWebView2.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            if (IsInternal(e.Uri))
            {
                _web.CoreWebView2.Navigate(e.Uri);
                return;
            }

            OpenExternal(e.Uri);
        };

        _web.CoreWebView2.DownloadStarting += (_, e) => SaveDownload(e);

        if (_development)
        {
            _web.CoreWebView2.OpenDevToolsWindow();
        }

        _web.CoreWebView2.Navigate(_startUrl);
    }

    private void SaveDownload(CoreWebView2DownloadStartingEventArgs e)
    {
        var name = Path.GetFileName(e.ResultFilePath);
        var extension = Path.GetExtension(name).TrimStart('.').ToLowerInvariant();

        using var dialog = new SaveFileDialog
        {
            Title = "Salvar arquivo",
            FileName = name,
            DefaultExt = extension,
            AddExtension = true,
            InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            OverwritePrompt = true,
            Filter = FilterFor(extension)
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            e.Cancel = true;
            return;
        }

        var target = dialog.FileName;
        var operation = e.DownloadOperation;
        e.ResultFilePath = target;
        e.Handled = true;

        operation.StateChanged += (_, _) =>
        {
            if (operation.State == CoreWebView2DownloadState.Completed)
            {
                ShowInFolder(target);
            }
        };
    }

    private static string FilterFor(string extension)
    {
        var specific = extension switch
        {
            "pdf" => "Documento PDF (*.pdf)|*.pdf",
            "xlsx" => "Planilha do Excel (*.xlsx)|*.xlsx",
            "csv" => "Arquivo CSV (*.csv)|*.csv",
            "json" => "Arquivo JSON (*.json)|*.json",
            "zip" => "Arquivo compactado (*.zip)|*.zip",
            "png" => "Imagem PNG (*.png)|*.png",
            "jpg" or "jpeg" => "Imagem JPG (*.jpg;*.jpeg)|*.jpg;*.jpeg",
            "webp" => "Imagem WebP (*.webp)|*.webp",
            "svg" => "Imagem SVG (*.svg)|*.svg",
            "txt" => "Arquivo de texto (*.txt)|*.txt",
            _ => null
        };

        const string all = "Todos os arquivos (*.*)|*.*";
        return specific is null ? all : $"{specific}|{all}";
    }

    private static void ShowInFolder(string file)
    {
        if (File.Exists(file))
        {
            Process.Start(new ProcessStartInfo("explorer.exe", $"/select,\"{file}\"") { UseShellExecute = true });
        }
    }

    private async Task<bool> EnsureRuntimeAsync()
    {
        var answer = MessageBox.Show(
            this,
            "O PeopleFlow precisa do componente Microsoft Edge WebView2 Runtime, que não foi encontrado neste computador.\n\nEle será baixado da Microsoft e instalado agora. O Windows pode pedir permissão de administrador. Continuar?",
            WindowTitle,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (answer != DialogResult.Yes)
        {
            return false;
        }

        var dark = IsDarkTheme();
        var notice = new Label
        {
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font(Font.FontFamily, 13f),
            ForeColor = dark ? Color.FromArgb(230, 234, 242) : Color.FromArgb(20, 27, 45),
            Text = "Instalando o componente WebView2...\nIsso pode levar alguns minutos, aguarde."
        };

        _web.Visible = false;
        Controls.Add(notice);
        var installed = await WebView2Installer.InstallAsync();
        Controls.Remove(notice);
        notice.Dispose();
        _web.Visible = true;

        if (installed)
        {
            return true;
        }

        var manual = MessageBox.Show(
            this,
            "Não foi possível instalar o WebView2 automaticamente.\n\nDeseja abrir a página de download para instalar manualmente? Depois é só abrir o PeopleFlow de novo.",
            WindowTitle,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Warning);

        if (manual == DialogResult.Yes)
        {
            OpenExternal(RuntimeDownloadPage);
        }

        return false;
    }

    private bool IsInternal(string uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out var target))
        {
            return false;
        }

        if (target.Scheme is "about" or "data")
        {
            return true;
        }

        if (target.Scheme == "blob" && Uri.TryCreate(target.AbsolutePath, UriKind.Absolute, out var origin))
        {
            target = origin;
        }

        return _internalAuthorities.Contains(target.GetLeftPart(UriPartial.Authority));
    }

    private static void OpenExternal(string uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out var target) || target.Scheme is not ("http" or "https" or "mailto"))
        {
            return;
        }

        Process.Start(new ProcessStartInfo(target.AbsoluteUri) { UseShellExecute = true });
    }

    private static bool IsDarkTheme()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            return key?.GetValue("AppsUseLightTheme") is int light && light == 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _web.Dispose();
        }

        base.Dispose(disposing);
    }
}
