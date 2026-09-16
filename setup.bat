@echo off
REM ============================================================
REM  EduCenterJM - one-click setup (CMD wrapper for setup.ps1)
REM  Installs dependencies, configures .env, and prepares the
REM  SQLite database. Safe to re-run at any time.
REM ============================================================
setlocal
set "SCRIPT_DIR=%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Windows PowerShell is required but was not found.
  echo  Please install PowerShell or PowerShell 7 ^(https://aka.ms/powershell^).
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup.ps1"

echo.
pause
endlocal
