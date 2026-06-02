$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'start-dev.ps1'

if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Missing start-dev.ps1"
}

$content = Get-Content -LiteralPath $scriptPath -Raw
$requiredSnippets = @(
  'docker compose up -d',
  'pg_isready',
  'backend/src/config/init.sql',
  'backend\.env.example',
  'frontend\.env.example',
  'npm install',
  'npm run dev',
  '$BackendPort = 4000',
  '$FrontendPort = 4002',
  'VITE_API_URL',
  '--host 127.0.0.1'
)

foreach ($snippet in $requiredSnippets) {
  if ($content -notmatch [regex]::Escape($snippet)) {
    throw "start-dev.ps1 does not contain required startup step: $snippet"
  }
}

Write-Host 'start-dev.ps1 structure looks good.'
