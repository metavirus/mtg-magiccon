$ErrorActionPreference = 'Stop'

$expectedGitHubLogin = 'metavirus'
$requiredGitHubScope = 'workflow'
$root = (git rev-parse --show-toplevel).Trim()
Push-Location $root

try {
  git check-ignore -q -- '.codex-local/'
  if ($LASTEXITCODE -ne 0) {
    throw '.codex-local/ must be ignored before repo-local GitHub auth can be stored.'
  }

  $ghExe = (Get-Command gh -ErrorAction Stop).Source
  $ghConfigDir = Join-Path $root '.codex-local\gh'
  New-Item -ItemType Directory -Force -Path $ghConfigDir | Out-Null
  $env:GH_CONFIG_DIR = $ghConfigDir

  $savedErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $statusOutput = (& $ghExe auth status -h github.com 2>&1 | Out-String).Trim()
  $statusExitCode = $LASTEXITCODE
  $loginOutput = ''
  $loginExitCode = 1
  if ($statusExitCode -eq 0) {
    $loginOutput = (& $ghExe api user --jq .login 2>&1 | Out-String).Trim()
    $loginExitCode = $LASTEXITCODE
  }
  $ErrorActionPreference = $savedErrorActionPreference

  if ($statusExitCode -ne 0 -or $loginExitCode -ne 0 -or $loginOutput -ne $expectedGitHubLogin) {
    Write-Host 'Starting repo-local GitHub CLI auth for Codex.'
    Write-Host 'Token storage target: ignored .codex-local\gh in this repo.'
    & $ghExe auth login -h github.com -p https -w --insecure-storage -s $requiredGitHubScope
    if ($LASTEXITCODE -ne 0) { throw 'Repo-local GitHub CLI login failed.' }
  }

  $refreshedStatus = (& $ghExe auth status -h github.com 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Repo-local GitHub CLI auth could not be rechecked.' }
  if ($refreshedStatus -notmatch "(?i)\b$requiredGitHubScope\b") {
    Write-Host "GitHub workflow permission is missing; opening one bounded full authorization."
    & $ghExe auth login -h github.com -p https -w --insecure-storage -s $requiredGitHubScope
    if ($LASTEXITCODE -ne 0) { throw 'GitHub workflow-scope authorization failed.' }
  }

  & $ghExe config set -h github.com git_protocol https
  if ($LASTEXITCODE -ne 0) { throw 'Unable to set GitHub CLI git protocol to https.' }

  $finalStatus = (& $ghExe auth status -h github.com 2>&1 | Out-String).Trim()
  $finalStatusExitCode = $LASTEXITCODE
  $verifiedLogin = (& $ghExe api user --jq .login 2>&1 | Out-String).Trim()
  $verifiedLoginExitCode = $LASTEXITCODE
  if ($finalStatusExitCode -ne 0 -or $finalStatus -notmatch '(?i)Logged in to github.com account') {
    throw 'Repo-local GitHub CLI authentication did not remain valid after authorization.'
  }
  if ($finalStatus -notmatch "(?i)\b$requiredGitHubScope\b") {
    throw "Repo-local GitHub CLI token still lacks required '$requiredGitHubScope' scope."
  }
  if ($verifiedLoginExitCode -ne 0 -or $verifiedLogin -ne $expectedGitHubLogin) {
    throw "Repo-local GitHub CLI identity mismatch: expected $expectedGitHubLogin, got '$verifiedLogin'"
  }

  Write-Output "Repo-local GitHub CLI auth: PASS ($verifiedLogin via $ghConfigDir)"
} finally {
  Pop-Location
}
