$ErrorActionPreference = 'Stop'
$expectedRoot = 'C:\Users\kavig\Documents\Codex\mtg-magiccon'
$expectedRemote = 'https://github.com/metavirus/mtg-magiccon.git'
$expectedGitHubLogin = 'metavirus'
$requiredGitHubScope = 'workflow'
$expectedRef = 'pavjsexxbueuzhzgemgy'
$forbiddenRef = 'pyvftzsodzwfqncjbmbc'
$expectedMigrations = @('20260801184744', '20260801184828', '20260803173516')
$secretFile = '.secrets/database.env'
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

foreach ($localSecret in @('.env.local', $secretFile)) {
  if (Test-Path -LiteralPath $localSecret) {
    git check-ignore -q -- $localSecret
    if ($LASTEXITCODE -ne 0) { $failures += "$localSecret is not ignored" }
  }
}

git check-ignore -q -- '.codex-local/'
if ($LASTEXITCODE -ne 0) { $failures += '.codex-local/ is not ignored' }

$repoLocalGhConfigDir = Join-Path $expectedRoot '.codex-local\gh'
$repoLocalGhHosts = Join-Path $repoLocalGhConfigDir 'hosts.yml'
$usingRepoLocalGhAuth = $false
if (Test-Path -LiteralPath $repoLocalGhHosts) {
  $env:GH_CONFIG_DIR = $repoLocalGhConfigDir
  $usingRepoLocalGhAuth = $true
}

$bundledNodeCandidates = @(
  Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.cache\codex-runtimes') -Filter 'node.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*\dependencies\node\bin\node.exe' } |
    Sort-Object LastWriteTime -Descending |
    ForEach-Object FullName
)
$nodeExe = Resolve-Executable 'node' $bundledNodeCandidates
$pnpmExe = Resolve-Executable 'pnpm' @((Join-Path $env:USERPROFILE 'scoop\shims\pnpm.cmd'))
$ghExe = Resolve-Executable 'gh' @((Join-Path $env:USERPROFILE 'scoop\shims\gh.exe'), (Join-Path $env:USERPROFILE 'scoop\shims\gh.cmd'))
$supabaseExe = Resolve-Executable 'supabase' @((Join-Path $env:USERPROFILE 'scoop\shims\supabase.exe'))
$psqlExe = Resolve-Executable 'psql' @('C:\Program Files\PostgreSQL\18\bin\psql.exe', 'C:\Program Files\PostgreSQL\17\bin\psql.exe')

if (-not $nodeExe) { $failures += 'Node is unavailable' }
if (-not $pnpmExe) { $failures += 'pnpm is unavailable' }
if (-not $ghExe) { $failures += 'GitHub CLI gh is unavailable' }
if (-not $supabaseExe) { $failures += 'Supabase CLI is unavailable' }
if (-not $psqlExe) { $failures += 'PostgreSQL psql is unavailable' }

if ($ghExe) {
  $savedErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $ghStatusOutput = (& $ghExe auth status -h github.com 2>&1 | Out-String).Trim()
  $ghStatusExitCode = $LASTEXITCODE
  $ghLoginOutput = (& $ghExe api user --jq .login 2>&1 | Out-String).Trim()
  $ghLoginExitCode = $LASTEXITCODE
  $ghProtocolOutput = (& $ghExe config get -h github.com git_protocol 2>$null | Out-String).Trim()
  $ghProtocolExitCode = $LASTEXITCODE
  $ErrorActionPreference = $savedErrorActionPreference

  if ($ghStatusExitCode -ne 0) {
    $failures += "GitHub CLI auth is not usable from the repo-local Codex lane; run 'pnpm gh:auth-local' and rerun pnpm readiness"
  }
  if ($ghStatusExitCode -eq 0 -and $ghStatusOutput -notmatch "(?i)\b$requiredGitHubScope\b") {
    $failures += "GitHub CLI token lacks the '$requiredGitHubScope' scope required to update Actions workflows; run 'pnpm gh:auth-local' and rerun pnpm readiness"
  }
  if ($ghLoginExitCode -ne 0 -or $ghLoginOutput -ne $expectedGitHubLogin) {
    $failures += "GitHub CLI identity mismatch or token failure from the repo-local Codex lane: expected $expectedGitHubLogin, got '$ghLoginOutput'; run 'pnpm gh:auth-local'"
  }
  if ($ghProtocolExitCode -eq 0 -and $ghProtocolOutput -and $ghProtocolOutput -ne 'https') {
    $failures += "GitHub CLI git protocol should be https, got '$ghProtocolOutput'"
  }
}

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
  if ($migrationExitCode -eq 0) {
    foreach ($migration in $expectedMigrations) {
      if ($migrationOutput -notmatch $migration) { $failures += "Linked migration missing: $migration" }
    }
  } elseif ($migrationOutput -notmatch 'LegacyPlatformAuthRequiredError|Access token not provided') {
    $failures += 'Supabase linked migration query failed'
  }
}

if (-not (Test-Path -LiteralPath $secretFile)) { $failures += "Create ignored $secretFile as documented" }
else {
  $line = Get-Content -LiteralPath $secretFile | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
  if (-not $line) { $failures += "SUPABASE_DB_URL missing from $secretFile" }
  else {
    $dbUrl = $line.Substring('SUPABASE_DB_URL='.Length)
    if ($dbUrl -notmatch [regex]::Escape($expectedRef)) { $failures += 'Database URL project identity mismatch' }
    if ($dbUrl -notmatch ':5432/') { $failures += 'Database URL must use Session Pooler port 5432' }
    if ($dbUrl -notmatch 'sslmode=require') { $failures += 'Database URL must require SSL' }
    if ($psqlExe -and $failures.Count -eq 0) {
      if ($migrationExitCode -ne 0 -and $migrationOutput -match 'LegacyPlatformAuthRequiredError|Access token not provided') {
        $migrationProofSql = 'select version from supabase_migrations.schema_migrations order by version;'
        $migrationProof = (& $psqlExe $dbUrl -v ON_ERROR_STOP=1 -Atc $migrationProofSql 2>$null | Out-String)
        if ($LASTEXITCODE -ne 0) { $failures += 'Hosted migration proof failed through Session Pooler' }
        foreach ($migration in $expectedMigrations) {
          if ($migrationProof -notmatch $migration) { $failures += "Hosted migration missing: $migration" }
        }
      }
      $proofSql = @"
select
  current_database() = 'postgres'
  and (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.personal_notes'::regclass)
  and (select count(*) = 4 from pg_policies where schemaname = 'public' and tablename = 'personal_notes')
  and (select qual is not null and with_check is not null from pg_policies where schemaname = 'public' and tablename = 'personal_notes' and policyname = 'owners_update_personal_notes')
  and (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'personal_notes' and grantee = 'anon')
  and (select count(*) = 4 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'personal_notes' and grantee = 'authenticated')
  and (select bool_and(relrowsecurity and relforcerowsecurity) and count(*) = 5 from pg_class where oid = any(array[
    'public.sources'::regclass,
    'public.source_observations'::regclass,
    'public.occurrences'::regclass,
    'public.personal_decisions'::regclass,
    'public.itinerary_entries'::regclass
  ]))
  and (select count(*) = 20 from pg_policies where schemaname = 'public' and tablename in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries'))
  and (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries') and grantee = 'anon')
  and (select count(*) = 20 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries') and grantee = 'authenticated')
  and (select count(*) = 5 from pg_policies where schemaname = 'public' and tablename in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries') and cmd = 'UPDATE' and qual is not null and with_check is not null);
"@
      $databaseProof = (& $psqlExe $dbUrl -v ON_ERROR_STOP=1 -Atc $proofSql 2>$null | Out-String).Trim()
      if ($LASTEXITCODE -ne 0 -or $databaseProof -ne 't') { $failures += 'Hosted database identity/RLS/grant proof failed' }
    }
  }
}

if ($failures.Count) { $failures | ForEach-Object { Write-Error $_ }; exit 1 }
$ghAuthLane = if ($usingRepoLocalGhAuth) { 'repo-local GH_CONFIG_DIR' } else { 'default GH_CONFIG_DIR' }
Write-Output "Environment readiness: PASS ($expectedRef on $branch; GitHub CLI $expectedGitHubLogin via $ghAuthLane; hosted migrations; Session Pooler; RLS/grants)"
