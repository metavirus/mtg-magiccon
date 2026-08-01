param(
  [switch]$SkipDocker,
  [switch]$RequireDatabase
)

$ErrorActionPreference = 'Stop'
$expectedRoot = 'C:\Users\kavig\Documents\Codex\mtg-magiccon'
$expectedRemote = 'https://github.com/metavirus/mtg-magiccon.git'
$expectedRef = 'pavjsexxbueuzhzgemgy'
$forbiddenRef = 'pyvftzsodzwfqncjbmbc'
$expectedMigrations = @('20260801184744', '20260801184828')
$failures = @()

function Resolve-Executable([string]$Name, [string[]]$Candidates) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($candidate in $Candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
  }
  return $null
}

$root = (git rev-parse --show-toplevel).Trim().Replace('/', '\')
if (-not $root.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { $failures += "Repository root mismatch: $root" }
$remote = (git remote get-url origin).Trim()
if ($remote -ne $expectedRemote) { $failures += "Remote mismatch: $remote" }
$branch = (git branch --show-current).Trim()
if ($branch -ne 'main' -and -not $branch.StartsWith('codex/')) { $failures += "Unexpected branch: $branch" }
if (-not (Select-String -Quiet -LiteralPath '.env.example' -Pattern $expectedRef)) { $failures += 'Expected project ref missing from .env.example' }
if (git grep -l $forbiddenRef -- ':!scripts/environment_readiness.ps1') { $failures += 'Reference-project Supabase ref appears in tracked project content' }

foreach ($localSecret in @('.env.local', '.secrets/database.env')) {
  if (Test-Path -LiteralPath $localSecret) {
    git check-ignore -q -- $localSecret
    if ($LASTEXITCODE -ne 0) { $failures += "$localSecret is not ignored" }
  }
}

$nodeExe = Resolve-Executable 'node' @()
$pnpmExe = Resolve-Executable 'pnpm' @((Join-Path $env:USERPROFILE 'scoop\shims\pnpm.cmd'))
$supabaseExe = Resolve-Executable 'supabase' @((Join-Path $env:USERPROFILE 'scoop\shims\supabase.exe'))
$psqlExe = Resolve-Executable 'psql' @('C:\Program Files\PostgreSQL\18\bin\psql.exe', 'C:\Program Files\PostgreSQL\17\bin\psql.exe')
$dockerExe = Resolve-Executable 'docker' @((Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'), 'C:\Program Files\Docker\Docker\resources\bin\docker.exe')

if (-not $nodeExe) { $failures += 'Node is unavailable' }
if (-not $pnpmExe) { $failures += 'pnpm is unavailable' }
if (-not $supabaseExe) { $failures += 'Supabase CLI is unavailable' }
if (-not $psqlExe) { $failures += 'PostgreSQL psql is unavailable' }

$linkedRefFile = 'supabase/.temp/project-ref'
if (-not (Test-Path -LiteralPath $linkedRefFile)) { $failures += 'Supabase CLI project link is missing' }
elseif ((Get-Content -Raw -LiteralPath $linkedRefFile).Trim() -ne $expectedRef) { $failures += 'Supabase CLI project link identity mismatch' }

if ($supabaseExe -and (Test-Path -LiteralPath $linkedRefFile)) {
  $env:SUPABASE_TELEMETRY_DISABLED = '1'
  $savedErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $migrationOutput = (& $supabaseExe migration list --linked 2>&1 | Out-String)
  $migrationExitCode = $LASTEXITCODE
  $ErrorActionPreference = $savedErrorActionPreference
  if ($migrationExitCode -ne 0) { $failures += 'Supabase linked migration query failed' }
  foreach ($migration in $expectedMigrations) {
    if ($migrationOutput -notmatch $migration) { $failures += "Linked migration missing: $migration" }
  }
}

if (-not $SkipDocker) {
  if (-not $dockerExe) { $failures += 'Docker CLI is unavailable' }
  else {
    $savedErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $dockerServer = (& $dockerExe info --format '{{.ServerVersion}}' 2>$null | Out-String).Trim()
    $dockerExitCode = $LASTEXITCODE
    $ErrorActionPreference = $savedErrorActionPreference
    if ($dockerExitCode -ne 0 -or -not $dockerServer) { $failures += 'Docker engine is not running' }
  }
}

$secretFile = '.secrets/database.env'
if ($RequireDatabase -and -not (Test-Path -LiteralPath $secretFile)) { $failures += "Create ignored $secretFile as documented" }
if (Test-Path -LiteralPath $secretFile) {
  $line = Get-Content -LiteralPath $secretFile | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
  if (-not $line) { $failures += "SUPABASE_DB_URL missing from $secretFile" }
  else {
    $dbUrl = $line.Substring('SUPABASE_DB_URL='.Length)
    if ($dbUrl -notmatch [regex]::Escape($expectedRef)) { $failures += 'Database URL project identity mismatch' }
    if ($dbUrl -notmatch ':5432/') { $failures += 'Database URL must use Session Pooler port 5432' }
    if ($dbUrl -notmatch 'sslmode=require') { $failures += 'Database URL must require SSL' }
    if ($psqlExe -and $failures.Count -eq 0) {
      & $psqlExe $dbUrl -v ON_ERROR_STOP=1 -Atc "select current_database() = 'postgres'"
      if ($LASTEXITCODE -ne 0) { $failures += 'Session Pooler database query failed' }
    }
  }
}

if ($failures.Count) { $failures | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "Environment readiness: PASS ($expectedRef on $branch; Supabase link/migrations; psql; Docker=$(-not $SkipDocker))"
