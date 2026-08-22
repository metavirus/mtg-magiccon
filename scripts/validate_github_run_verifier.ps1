$ErrorActionPreference = 'Stop'
$path = Join-Path (git rev-parse --show-toplevel).Trim() 'scripts\verify_github_runs.ps1'
$lines = Get-Content -LiteralPath $path
$configLine = ($lines | Select-String -SimpleMatch '$env:GH_CONFIG_DIR = Join-Path $root').LineNumber
$ghCalls = @($lines | Select-String -Pattern '& \$ghExe\s')

if (-not $configLine) { throw 'GitHub run verifier must set the repo-local GH_CONFIG_DIR.' }
if (-not $ghCalls.Count) { throw 'GitHub run verifier contains no GitHub CLI calls.' }
if (@($ghCalls | Where-Object LineNumber -le $configLine).Count -gt 0) {
  throw 'GitHub run verifier calls gh before setting the repo-local GH_CONFIG_DIR.'
}

Write-Output 'GitHub run verifier guard: PASS (repo-local GH_CONFIG_DIR precedes every gh call)'
