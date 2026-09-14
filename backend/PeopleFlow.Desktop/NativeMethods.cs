using System.Runtime.InteropServices;

namespace PeopleFlow.Desktop;

internal static class NativeMethods
{
    private const int SwRestore = 9;
    private const int AttachParentProcess = -1;

    [DllImport("kernel32.dll")]
    private static extern bool AttachConsole(int processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string? className, string windowName);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr window);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr window, int command);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr window);

    public static void AttachParentConsole() => AttachConsole(AttachParentProcess);

    public static void BringWindowToFront(string title)
    {
        var window = FindWindow(null, title);
        if (window == IntPtr.Zero)
        {
            return;
        }

        if (IsIconic(window))
        {
            ShowWindow(window, SwRestore);
        }

        SetForegroundWindow(window);
    }
}
