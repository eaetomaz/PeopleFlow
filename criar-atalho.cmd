@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar-atalho.ps1" %*
exit /b %errorlevel%
