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
  'Wait-ForChroma',
  'backend/src/config/init.sql',
  'Render-Env-IfMissing',
  'scripts\iac\render-env.mjs',
  'backend\.env',
  'frontend\.env.local',
  'npm install',
  'npm run dev',
  '$BackendPort = 4000',
  '$FrontendPort = 4002',
  '--host 127.0.0.1'
)

foreach ($snippet in $requiredSnippets) {
  if ($content -notmatch [regex]::Escape($snippet)) {
    throw "start-dev.ps1 does not contain required startup step: $snippet"
  }
}

Write-Host 'start-dev.ps1 structure looks good.'
