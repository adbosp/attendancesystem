using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace AttendanceSystemLite;

public sealed class MainForm : Form
{
    private const string ProjectDir = @"C:\Users\HYVN\Documents\Codex\2026-07-01\project-attendance-management-system-basic-setup";
    private const string NginxDir = @"C:\nginx";
    private const string MongoService = "Truong-IT";
    private const string AppUrl = "http://localhost";

    private readonly WebView2 _webView = new();
    private readonly Label _statusLabel = new();

    public MainForm()
    {
        Text = "Attendance Management System";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(1100, 720);
        Font = new Font("Segoe UI", 10);
        KeyPreview = true;

        BuildLayout();
        Load += async (_, _) => await InitializeAsync();
        KeyDown += HandleAppShortcut;
    }

    private void BuildLayout()
    {
        _statusLabel.Dock = DockStyle.Bottom;
        _statusLabel.Height = 24;
        _statusLabel.TextAlign = ContentAlignment.MiddleLeft;
        _statusLabel.Padding = new Padding(12, 0, 12, 0);
        _statusLabel.ForeColor = Color.FromArgb(71, 85, 105);
        _statusLabel.BackColor = Color.FromArgb(248, 250, 252);
        _statusLabel.Text = "Starting Attendance System...";

        _webView.Dock = DockStyle.Fill;
        Controls.Add(_webView);
        Controls.Add(_statusLabel);
    }

    private async Task InitializeAsync()
    {
        SetStatus("Loading web app...");
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AttendanceSystemLite",
                "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(environment);
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            _webView.CoreWebView2.DocumentTitleChanged += (_, _) =>
            {
                Text = string.IsNullOrWhiteSpace(_webView.CoreWebView2.DocumentTitle)
                    ? "Attendance Management System"
                    : $"{_webView.CoreWebView2.DocumentTitle} - Attendance System";
            };
            _webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                SetStatus(args.IsSuccess
                    ? $"Ready - {AppUrl}"
                    : $"Cannot load web app: {args.WebErrorStatus}");
            };
            _webView.CoreWebView2.ContextMenuRequested += (_, args) => args.Handled = true;
            _webView.Source = new Uri($"{AppUrl}/login");
            _ = StartSystemInBackgroundAsync();
        }
        catch (Exception ex)
        {
            SetStatus($"WebView2 failed: {ex.Message}");
            MessageBox.Show(
                "Cannot load the embedded web view. Please install Microsoft Edge WebView2 Runtime or open the system in browser.",
                "Attendance System Lite",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            OpenUrl(AppUrl);
        }
    }

    private void HandleAppShortcut(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F5)
        {
            _webView.Reload();
            e.Handled = true;
            return;
        }

        if (e.Control && e.KeyCode == Keys.O)
        {
            OpenUrl(AppUrl);
            e.Handled = true;
        }
    }

    private async Task StartSystemInBackgroundAsync()
    {
        try
        {
            SetStatus("Checking services...");
            var changedServices = await StartSystemAsync();

            if (_webView.CoreWebView2 is not null)
            {
                BeginInvoke(() =>
                {
                    SetStatus($"Ready - {AppUrl}");
                    if (_webView.Source is null || !_webView.Source.Host.Contains("localhost", StringComparison.OrdinalIgnoreCase))
                    {
                        _webView.Source = new Uri($"{AppUrl}/login");
                    }
                    else if (changedServices)
                    {
                        _webView.Reload();
                    }
                });
            }
        }
        catch (Exception ex)
        {
            SetStatus($"Service check warning: {ex.Message}");
        }
    }

    private async Task<bool> StartSystemAsync()
    {
        if (IsNginxRunning() && await IsBackendReadyAsync())
        {
            SetStatus("Services already running.");
            return false;
        }

        var changedServices = false;
        changedServices |= await StartMongoAsync();
        changedServices |= await StartNginxAsync();
        changedServices |= await StartBackendAsync();
        return changedServices;
    }

    private async Task<bool> StartMongoAsync()
    {
        var status = await RunProcessAsync("sc.exe", $"query \"{MongoService}\"");
        if (!status.Contains("RUNNING", StringComparison.OrdinalIgnoreCase))
        {
            SetStatus("Starting MongoDB...");
            await RunProcessAsync("net.exe", $"start \"{MongoService}\"");
            return true;
        }

        return false;
    }

    private async Task<bool> StartNginxAsync()
    {
        var nginxExe = Path.Combine(NginxDir, "nginx.exe");
        if (!File.Exists(nginxExe))
        {
            SetStatus("Nginx not found at C:\\nginx.");
            return false;
        }

        if (IsNginxRunning())
        {
            return false;
        }

        SetStatus("Starting Nginx...");
        StartHidden(nginxExe, "", NginxDir);
        await Task.Delay(1000);
        return true;
    }

    private async Task<bool> StartBackendAsync()
    {
        if (await IsBackendReadyAsync())
        {
            return false;
        }

        SetStatus("Starting backend API...");
        StartHidden("cmd.exe", $"/c \"cd /d \"\"{ProjectDir}\"\" && npm run server\"", ProjectDir);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await Task.Delay(1000);
            if (await IsBackendReadyAsync())
            {
                return true;
            }
        }

        return true;
    }

    private static bool IsNginxRunning() => Process.GetProcessesByName("nginx").Length > 0;

    private static void StartHidden(string fileName, string arguments, string workingDirectory)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
        });
    }

    private static async Task<string> RunProcessAsync(string fileName, string arguments)
    {
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };

        process.Start();
        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        return string.IsNullOrWhiteSpace(error) ? output : $"{output}{Environment.NewLine}{error}";
    }

    private static async Task<bool> IsBackendReadyAsync()
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            using var response = await client.GetAsync("http://localhost:5000/");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private void SetStatus(string message)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => SetStatus(message));
            return;
        }

        _statusLabel.Text = message;
    }

    private static void OpenUrl(string url)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true,
        });
    }
}
