$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PostgresContainer = 'ai-notes-postgres'
$PostgresUser = 'postgres'
$PostgresDb = 'ainotes'
$BackendPort = 4000
$FrontendPort = 4002

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Copy-Env-IfMissing {
  param(
    [string]$ExamplePath,
    [string]$TargetPath
  )

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
    Write-Host "Created $TargetPath from $ExamplePath"
  }
}

function Escape-SingleQuote {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Start-DevWindow {
  param(
    [string]$Title,
    [string]$WorkingDirectory,
    [string[]]$Commands
  )

  $escapedDir = Escape-SingleQuote $WorkingDirectory
  $command = "Set-Location -LiteralPath '$escapedDir'; " + ($Commands -join '; ')

  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "[Console]::Title = '$Title'; $command"
  )
}

function Wait-ForPostgres {
  $maxAttempts = 30

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    docker exec $PostgresContainer pg_isready -U $PostgresUser -d $PostgresDb | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Write-Host "Waiting for PostgreSQL ($attempt/$maxAttempts)..."
    Start-Sleep -Seconds 2
  }

  throw 'PostgreSQL did not become ready in time.'
}

function Wait-ForChroma {
  $maxAttempts = 30

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/v2/heartbeat' -UseBasicParsing -TimeoutSec 2 | Out-Null
      return
    } catch {
      Write-Host "Waiting for ChromaDB ($attempt/$maxAttempts)..."
      Start-Sleep -Seconds 2
    }
  }

  Write-Host 'ChromaDB did not become ready in time. The app can still run with keyword-search fallback.'
}

Require-Command docker
Require-Command npm

docker compose version | Out-Null

Copy-Env-IfMissing `
  -ExamplePath (Join-Path $Root 'deploy\iac\local.backend.env.example') `
  -TargetPath (Join-Path $Root 'backend\.env')

Copy-Env-IfMissing `
  -ExamplePath (Join-Path $Root 'deploy\iac\local.frontend.env.example') `
  -TargetPath (Join-Path $Root 'frontend\.env.local')

Set-Location -LiteralPath $Root

Write-Host 'Starting PostgreSQL...'
docker compose up -d

Wait-ForPostgres
Wait-ForChroma

$initSql = Join-Path $Root 'backend/src/config/init.sql'
Write-Host 'Initializing database schema...'
Get-Content -LiteralPath $initSql -Raw | docker exec -i $PostgresContainer psql -U $PostgresUser -d $PostgresDb

Write-Host 'Starting backend and frontend dev servers...'
Start-DevWindow `
  -Title 'AI Note Keeper Backend' `
  -WorkingDirectory (Join-Path $Root 'backend') `
  -Commands @(
    "`$env:PORT = '$BackendPort'",
    "`$env:FRONTEND_URL = 'http://localhost:$FrontendPort'",
    "`$env:CHROMA_URL = 'http://localhost:8000'",
    'npm install',
    'npm run dev'
  )

Start-DevWindow `
  -Title 'AI Note Keeper Frontend' `
  -WorkingDirectory (Join-Path $Root 'frontend') `
  -Commands @(
    "`$env:VITE_API_URL = 'http://localhost:$BackendPort/api'",
    'npm install',
    "npm run dev -- --host 127.0.0.1 --port $FrontendPort"
  )

Write-Host ''
Write-Host 'Dev environment is starting:'
Write-Host "  Frontend: http://localhost:$FrontendPort"
Write-Host "  Backend:  http://localhost:$BackendPort/api"
