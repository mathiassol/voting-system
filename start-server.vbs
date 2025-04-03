Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /K cd /d C:\Users\mathias\WebstormProjects\voting && node server.js", 1, False