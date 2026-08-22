param(
  [Parameter(Mandatory = $true)]
  [string]$CommitSha,
  [int]$TimeoutMinutes = 10
)

$ErrorActionPreference = 'Stop'
$root = (git rev-parse --show-toplevel).Trim()
$env:GH_CONFIG_DIR = Join-Path $root '.codex-local\gh'
$ghExe = (Get-Command gh -ErrorAction Stop).Source

$authStatus = (& $ghExe auth status -h github.com 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Repo-local GitHub CLI authentication is unavailable.' }
$login = (& $ghExe api user --jq .login 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $login -ne 'metavirus') {
  throw "Repo-local GitHub CLI identity mismatch: expected metavirus, got '$login'."
}

$resolvedSha = (git rev-parse $CommitSha).Trim()
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$expectedWorkflows = @('CI', 'Deploy MagicCon companion to GitHub Pages')

do {
  $response = & $ghExe api "repos/metavirus/mtg-magiccon/actions/runs?head_sha=$resolvedSha&per_page=20"
  if ($LASTEXITCODE -ne 0) { throw "Unable to read GitHub Actions runs for $resolvedSha." }
  $runs = @((($response | ConvertFrom-Json).workflow_runs) | Where-Object { $_.name -in $expectedWorkflows })
  if ($runs.Count -eq $expectedWorkflows.Count -and @($runs | Where-Object status -ne 'completed').Count -eq 0) { break }
  Start-Sleep -Seconds 10
} while ((Get-Date) -lt $deadline)

if ($runs.Count -ne $expectedWorkflows.Count -or @($runs | Where-Object status -ne 'completed').Count -ne 0) {
  throw "Timed out waiting for CI and Pages runs for $resolvedSha."
}
if (@($runs | Where-Object conclusion -ne 'success').Count -ne 0) {
  $runs | Select-Object name, id, status, conclusion, html_url, head_sha | Format-Table | Out-String | Write-Host
  throw "CI or Pages did not succeed for $resolvedSha."
}

$runs |
  Sort-Object name |
  Select-Object name, id, status, conclusion, html_url, head_sha |
  ConvertTo-Json
