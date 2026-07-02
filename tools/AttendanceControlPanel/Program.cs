using System.Diagnostics;
using System.Drawing;
using System.Net.Http;
using Microsoft.Win32;

namespace AttendanceControlPanel;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new ControlPanelForm());
    }
}

public sealed class ControlPanelForm : Form
{
    private const string ProjectDir = @"C:\Users\HYVN\Documents\Codex\2026-07-01\project-attendance-management-system-basic-setup";
    private const string NginxDir = @"C:\nginx";
    private const string MongoService = "Truong-IT";
    private const string StartupName = "AttendanceManagementSystem";

    private readonly Label _mongoStatus = new();
    private readonly Label _nginxStatus = new();
    private readonly Label _backendStatus = new();
    private readonly CheckBox _runWithWindows = new();
    private readonly CheckBox _showServerWindow = new();
    private readonly TextBox _logBox = new();
    private readonly Button _startButton = new();
    private readonly Button _stopButton = new();
    private readonly Button _restartButton = new();
    private readonly Button _openButton = new();
    private readonly System.Windows.Forms.Timer _timer = new();

    public ControlPanelForm()
    {
        Text = "Attendance System Control";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(760, 520);
        Size = new Size(820, 560);
        Font = new Font("Segoe UI", 10);

        BuildLayout();
        Load += async (_, _) =>
        {
            _runWithWindows.Checked = IsRunWithWindowsEnabled();
            await RefreshStatusAsync();
        };

        _timer.Interval = 5000;
        _timer.Tick += async (_, _) => await RefreshStatusAsync();
        _timer.Start();
    }

    private void BuildLayout()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(18),
            ColumnCount = 1,
            RowCount = 5,
        };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        var title = new Label
        {
            Text = "Attendance Management System",
            Font = new Font("Segoe UI", 18, FontStyle.Bold),
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 4),
        };
        var subtitle = new Label
        {
            Text = "Control Nginx, MongoDB, and backend API from one place.",
            ForeColor = Color.FromArgb(86, 105, 128),
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 2),
        };
        var createdBy = new Label
        {
            Text = "Create by Truong-IT",
            ForeColor = Color.FromArgb(37, 99, 235),
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 18),
        };
        var header = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Dock = DockStyle.Top };
        header.Controls.Add(title);
        header.Controls.Add(subtitle);
        header.Controls.Add(createdBy);

        var statusGrid = new TableLayoutPanel
        {
            ColumnCount = 3,
            RowCount = 1,
            Dock = DockStyle.Top,
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 14),
        };
        statusGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        statusGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        statusGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        statusGrid.Controls.Add(CreateStatusCard("MongoDB", _mongoStatus), 0, 0);
        statusGrid.Controls.Add(CreateStatusCard("Nginx", _nginxStatus), 1, 0);
        statusGrid.Controls.Add(CreateStatusCard("Backend API", _backendStatus), 2, 0);

        _runWithWindows.Text = "Run with Windows";
        _runWithWindows.AutoSize = true;
        _runWithWindows.CheckedChanged += (_, _) => SetRunWithWindows(_runWithWindows.Checked);

        _showServerWindow.Text = "Show server console window";
        _showServerWindow.AutoSize = true;
        _showServerWindow.Checked = false;

        var options = new FlowLayoutPanel
        {
            AutoSize = true,
            Dock = DockStyle.Top,
            Margin = new Padding(0, 0, 0, 14),
        };
        options.Controls.Add(_runWithWindows);
        options.Controls.Add(_showServerWindow);

        _logBox.Multiline = true;
        _logBox.ReadOnly = true;
        _logBox.ScrollBars = ScrollBars.Vertical;
        _logBox.Dock = DockStyle.Fill;
        _logBox.BackColor = Color.FromArgb(17, 24, 39);
        _logBox.ForeColor = Color.FromArgb(226, 232, 240);
        _logBox.Font = new Font("Consolas", 9);

        _startButton.Text = "Start System";
        _startButton.Click += async (_, _) => await RunActionAsync(StartSystemAsync);

        _stopButton.Text = "Stop System";
        _stopButton.Click += async (_, _) => await RunActionAsync(StopSystemAsync);

        _restartButton.Text = "Restart System";
        _restartButton.Click += async (_, _) => await RunActionAsync(RestartSystemAsync);

        _openButton.Text = "Open Login";
        _openButton.Click += (_, _) => OpenUrl("http://localhost/login");

        var buttons = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.RightToLeft,
            AutoSize = true,
            Dock = DockStyle.Bottom,
            Padding = new Padding(0, 14, 0, 0),
        };
        foreach (var button in new[] { _openButton, _restartButton, _stopButton, _startButton })
        {
            button.Width = 132;
            button.Height = 38;
            button.Margin = new Padding(8, 0, 0, 0);
            buttons.Controls.Add(button);
        }

        root.Controls.Add(header, 0, 0);
        root.Controls.Add(statusGrid, 0, 1);
        root.Controls.Add(options, 0, 2);
        root.Controls.Add(_logBox, 0, 3);
        root.Controls.Add(buttons, 0, 4);
        Controls.Add(root);
    }

    private static Panel CreateStatusCard(string title, Label statusLabel)
    {
        var panel = new Panel
        {
            Height = 82,
            Dock = DockStyle.Fill,
            Margin = new Padding(0, 0, 10, 0),
            BackColor = Color.FromArgb(246, 248, 251),
            Padding = new Padding(14),
        };

        var titleLabel = new Label
        {
            Text = title,
            Dock = DockStyle.Top,
            Height = 25,
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
        };

        statusLabel.Text = "Checking...";
        statusLabel.Dock = DockStyle.Fill;
        statusLabel.Font = new Font("Segoe UI", 13, FontStyle.Bold);
        statusLabel.ForeColor = Color.FromArgb(100, 116, 139);

        panel.Controls.Add(statusLabel);
        panel.Controls.Add(titleLabel);
        return panel;
    }

    private async Task RunActionAsync(Func<Task> action)
    {
        SetButtons(false);
        try
        {
            await action();
            await RefreshStatusAsync();
        }
        catch (Exception ex)
        {
            Log($"ERROR: {ex.Message}");
        }
        finally
        {
            SetButtons(true);
        }
    }

    private void SetButtons(bool enabled)
    {
        _startButton.Enabled = enabled;
        _stopButton.Enabled = enabled;
        _restartButton.Enabled = enabled;
        _openButton.Enabled = enabled;
    }

    private async Task StartSystemAsync()
    {
        Log("Starting Attendance System...");
        await StartMongoAsync();
        await StartNginxAsync();
        await StartBackendAsync();
        Log("System started.");
    }

    private async Task StopSystemAsync()
    {
        Log("Stopping Attendance System...");
        await StopBackendAsync();
        await StopNginxAsync();
        Log("System stopped.");
    }

    private async Task RestartSystemAsync()
    {
        Log("Restarting Attendance System...");
        await StopBackendAsync();
        await StartMongoAsync();
        await RestartNginxAsync();
        await StartBackendAsync();
        Log("System restarted.");
    }

    private async Task StartMongoAsync()
    {
        var status = await RunProcessAsync("sc.exe", $"query \"{MongoService}\"");
        if (!status.Contains("RUNNING", StringComparison.OrdinalIgnoreCase))
        {
            Log("Starting MongoDB service...");
            await RunProcessAsync("net.exe", $"start \"{MongoService}\"");
        }
        else
        {
            Log("MongoDB is already running.");
        }
    }

    private async Task StartNginxAsync()
    {
        if (!File.Exists(Path.Combine(NginxDir, "nginx.exe")))
        {
            Log("Nginx not found at C:\\nginx\\nginx.exe.");
            return;
        }

        if (IsProcessRunning("nginx"))
        {
            Log("Nginx is already running. Reloading config...");
            await RunProcessAsync(Path.Combine(NginxDir, "nginx.exe"), "-s reload", NginxDir);
            return;
        }

        Log("Starting Nginx...");
        StartDetached(Path.Combine(NginxDir, "nginx.exe"), "", NginxDir, false);
    }

    private async Task StopNginxAsync()
    {
        if (!File.Exists(Path.Combine(NginxDir, "nginx.exe")))
        {
            return;
        }

        if (IsProcessRunning("nginx"))
        {
            Log("Stopping Nginx...");
            await RunProcessAsync(Path.Combine(NginxDir, "nginx.exe"), "-s quit", NginxDir);
            await Task.Delay(800);
            await KillProcessesByNameAsync("nginx");
        }
        else
        {
            Log("Nginx is not running.");
        }
    }

    private async Task RestartNginxAsync()
    {
        await StopNginxAsync();
        await StartNginxAsync();
    }

    private async Task StartBackendAsync()
    {
        if (await IsPortOpenAsync(5000))
        {
            Log("Backend port 5000 is already running. Restarting backend...");
            await StopBackendAsync();
        }

        Log("Starting backend API on 0.0.0.0:5000...");
        StartDetached("cmd.exe", $"/k \"cd /d \"\"{ProjectDir}\"\" && npm run server\"", ProjectDir, _showServerWindow.Checked);
        await Task.Delay(2500);
    }

    private async Task StopBackendAsync()
    {
        var pids = await GetPidsListeningOnPortAsync(5000);
        if (pids.Count == 0)
        {
            Log("Backend is not running on port 5000.");
            return;
        }

        foreach (var pid in pids)
        {
            Log($"Stopping backend process {pid}...");
            await RunProcessAsync("taskkill.exe", $"/F /PID {pid}");
        }
    }

    private async Task RefreshStatusAsync()
    {
        var mongoOutput = await RunProcessAsync("sc.exe", $"query \"{MongoService}\"");
        SetStatus(_mongoStatus, mongoOutput.Contains("RUNNING", StringComparison.OrdinalIgnoreCase));
        SetStatus(_nginxStatus, IsProcessRunning("nginx"));
        SetStatus(_backendStatus, await IsPortOpenAsync(5000));
    }

    private static void SetStatus(Label label, bool running)
    {
        label.Text = running ? "Running" : "Stopped";
        label.ForeColor = running ? Color.FromArgb(22, 163, 74) : Color.FromArgb(220, 38, 38);
    }

    private static bool IsProcessRunning(string name)
    {
        return Process.GetProcessesByName(name).Length > 0;
    }

    private static async Task KillProcessesByNameAsync(string name)
    {
        foreach (var process in Process.GetProcessesByName(name))
        {
            try
            {
                await RunProcessAsync("taskkill.exe", $"/F /PID {process.Id}");
            }
            catch
            {
                // Keep stopping the rest of the process group.
            }
        }
    }

    private static async Task<bool> IsPortOpenAsync(int port)
    {
        var output = await RunProcessAsync("netstat.exe", "-ano");
        return output.Split(Environment.NewLine).Any((line) =>
            line.Contains($":{port} ", StringComparison.OrdinalIgnoreCase) &&
            line.Contains("LISTENING", StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<List<int>> GetPidsListeningOnPortAsync(int port)
    {
        var pids = new List<int>();
        var output = await RunProcessAsync("netstat.exe", "-ano");

        foreach (var line in output.Split(Environment.NewLine))
        {
            if (!line.Contains($":{port} ", StringComparison.OrdinalIgnoreCase) ||
                !line.Contains("LISTENING", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (int.TryParse(parts.LastOrDefault(), out var pid) && !pids.Contains(pid))
            {
                pids.Add(pid);
            }
        }

        return pids;
    }

    private static void StartDetached(string fileName, string arguments, string workingDirectory, bool showWindow)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = true,
            WindowStyle = showWindow ? ProcessWindowStyle.Normal : ProcessWindowStyle.Hidden,
        };
        Process.Start(startInfo);
    }

    private static async Task<string> RunProcessAsync(string fileName, string arguments, string? workingDirectory = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory ?? ProjectDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };

        using var process = Process.Start(startInfo);
        if (process == null)
        {
            return "";
        }

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        return output + error;
    }

    private bool IsRunWithWindowsEnabled()
    {
        using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false);
        return string.Equals(key?.GetValue(StartupName)?.ToString(), Application.ExecutablePath, StringComparison.OrdinalIgnoreCase);
    }

    private void SetRunWithWindows(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            if (enabled)
            {
                key?.SetValue(StartupName, Application.ExecutablePath);
                Log("Run with Windows enabled.");
            }
            else
            {
                key?.DeleteValue(StartupName, false);
                Log("Run with Windows disabled.");
            }
        }
        catch (Exception ex)
        {
            Log($"Cannot update startup setting: {ex.Message}");
        }
    }

    private void Log(string message)
    {
        _logBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
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
