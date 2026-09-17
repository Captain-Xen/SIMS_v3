<#
================================================================================
 EduCenterJM — Secondary School Management System
 One-command setup script (Windows PowerShell / CMD, also works with pwsh on
 macOS & Linux).

 What it does:
   1. Detects Bun (preferred) or Node.js — offers to install Bun via winget
      if neither is present.
   2. Installs all project dependencies.
   3. Creates/validates the .env file pointing at the local SQLite database.
   4. Generates the Prisma client and pushes the schema to the database.

 How to run:
   - Double-click setup.bat, or
   - powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1

 After it finishes, start the app with:
   - bun run dev          (macOS / Linux)
   - npm run dev:win      (Windows CMD / PowerShell)
================================================================================
#>

#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step($msg)  { Write-Host "" ; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    OK: $msg" -ForegroundColor Green }
function Assert-LastExit($label) {
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit code $LASTEXITCODE)." }
}

try {
  Write-Host "==============================================================" -ForegroundColor Cyan
  Write-Host "  EduCenterJM — setup" -ForegroundColor Cyan
  Write-Host "  Project: $ProjectRoot" -ForegroundColor DarkGray
  Write-Host "==============================================================" -ForegroundColor Cyan

  # ---------------------------------------------------------------------------
  # 1. Locate a JavaScript runtime (prefer Bun, fall back to Node.js)
  # ---------------------------------------------------------------------------
  Write-Step "Checking for Bun / Node.js..."
  $bunCmd  = Get-Command bun  -ErrorAction SilentlyContinue
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue

  if (-not $bunCmd -and -not $nodeCmd) {
    Write-Host "    Neither Bun nor Node.js was found. Trying to install Bun via winget..."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
      winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements
      Assert-LastExit "winget install Oven-sh.Bun"
      # Refresh PATH for this session so bun is immediately visible.
      $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                  [System.Environment]::GetEnvironmentVariable('Path', 'User')
      $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    }
    if (-not $bunCmd) {
      Write-Host ""
      Write-Host "    Could not install Bun automatically. Please install either one:" -ForegroundColor Yellow
      Write-Host "      - Bun:  https://bun.sh      (fastest, recommended)" -ForegroundColor Yellow
      Write-Host "              winget install Oven-sh.Bun" -ForegroundColor Yellow
      Write-Host "      - Node: https://nodejs.org  (LTS version 20+)" -ForegroundColor Yellow
      Write-Host "    ...then run this script again." -ForegroundColor Yellow
      exit 1
    }
  }

  $useBun = $false
  if (Get-Command bun -ErrorAction SilentlyContinue) {
    $useBun = $true
    $bunVersion = (& bun --version)
    Write-Ok "Bun $bunVersion detected — using bun."
  } else {
    $nodeVersion = (& node --version)
    $npmVersion  = (& npm --version)
    Write-Ok "Node $nodeVersion (npm $npmVersion) detected — using npm."
  }

  # ---------------------------------------------------------------------------
  # 2. Install dependencies
  # ---------------------------------------------------------------------------
  Write-Step "Installing project dependencies (this can take a few minutes)..."
  if ($useBun) {
    & bun install
    Assert-LastExit "bun install"
  } else {
    & npm install
    Assert-LastExit "npm install"
  }
  Write-Ok "All dependencies installed (Next.js 16, React 19, Prisma, Tailwind, shadcn/ui, ...)."

  # ---------------------------------------------------------------------------
  # 3. Configure .env (SQLite database path)
  # ---------------------------------------------------------------------------
  Write-Step "Configuring .env (local SQLite database)..."
  $dbDir  = Join-Path $ProjectRoot 'db'
  if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir | Out-Null }
  $dbPath   = Join-Path $dbDir 'custom.db'
  $envPath  = Join-Path $ProjectRoot '.env'

  # Portable absolute file URL that always points at THIS machine's project dir.
  $portableUrl = 'file:' + ($dbPath -replace '\\', '/')

  $needWrite = $true
  if (Test-Path $envPath) {
    $existing = Get-Content $envPath -Raw -ErrorAction SilentlyContinue
    if ($existing -match 'DATABASE_URL\s*=\s*"?([^"\r\n]+)"?') {
      $url = $Matches[1].Trim()
      $refPath = $url -replace '^file:', ''
      if ($refPath -and (Test-Path $refPath)) {
        $needWrite = $false
        Write-Ok "Keeping existing DATABASE_URL ($url)."
      } else {
        Write-Host "    Existing DATABASE_URL points at a file that does not exist on this machine."
      }
    }
  }
  if ($needWrite) {
    Set-Content -Path $envPath -Value "DATABASE_URL=$portableUrl" -Encoding ASCII
    Write-Ok "Wrote .env with DATABASE_URL=$portableUrl"
  }

  # ---------------------------------------------------------------------------
  # 4. Prisma client + database schema
  # ---------------------------------------------------------------------------
  Write-Step "Generating the Prisma client and creating the database schema..."
  if ($useBun) {
    & bun run db:generate
    Assert-LastExit "bun run db:generate"
    & bun run db:push
    Assert-LastExit "bun run db:push"
  } else {
    & npm run db:generate
    Assert-LastExit "npm run db:generate"
    & npm run db:push
    Assert-LastExit "npm run db:push"
  }
  Write-Ok "Database ready at $dbPath"

  # ---------------------------------------------------------------------------
  # Done — next steps
  # ---------------------------------------------------------------------------
  Write-Host ""
  Write-Host "==============================================================" -ForegroundColor Green
  Write-Host "  Setup complete!" -ForegroundColor Green
  Write-Host "==============================================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Start the app:" -ForegroundColor White
  if ($useBun) {
    Write-Host "      bun run dev" -ForegroundColor Yellow
    Write-Host "      (or: npm run dev:win)" -ForegroundColor DarkGray
  } else {
    Write-Host "      npm run dev:win" -ForegroundColor Yellow
    Write-Host "      (or: bun run dev, if you later install bun)" -ForegroundColor DarkGray
  }
  Write-Host ""
  Write-Host "  Then open:  http://localhost:3000" -ForegroundColor White
  Write-Host ""
  Write-Host "  Demo accounts (one-click buttons on the login screen):" -ForegroundColor White
  Write-Host "      Admin    admin@edu.edu    / admin123"
  Write-Host "      Teacher  staff@edu.edu    / staff123"
  Write-Host "      Student  student@edu.edu  / student123"
  Write-Host ""
  Write-Host "  Want demo data (students, grades, books, fees, ...)? While" -ForegroundColor White
  Write-Host "  the app is running: System Settings -> Danger Zone ->" -ForegroundColor White
  Write-Host "  'Reset Demo Data'." -ForegroundColor White
  Write-Host ""
} catch {
  Write-Host ""
  Write-Host "    SETUP FAILED: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "    Fix the issue above and run this script again." -ForegroundColor Red
  exit 1
}
