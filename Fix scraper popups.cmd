@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0collector\desktop.ps1" -Mode Repair
pause
