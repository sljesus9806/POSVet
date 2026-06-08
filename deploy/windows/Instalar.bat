@echo off
REM Doble clic aqui para instalar Ligerito en esta PC (Windows).
REM Llama al instalador de PowerShell permitiendo que el script corra.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
echo.
pause
