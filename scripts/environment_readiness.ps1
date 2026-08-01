$ErrorActionPreference = 'Stop'
$expectedRoot = 'C:\Users\kavig\Documents\Codex\mtg-magiccon'
$expectedRemote = 'https://github.com/metavirus/mtg-magiccon.git'
$expectedRef = 'pavjsexxbueuzhzgemgy'
$forbiddenRef = 'pyvftzsodzwfqncjbmbc'
$failures = @()

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

if (Test-Path -LiteralPath '.secrets/database.env') {
  $line = Get-Content -LiteralPath '.secrets/database.env' | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
  if (-not $line) { $failures += 'SUPABASE_DB_URL missing from .secrets/database.env' }
  else {
    $dbUrl = $line.Substring('SUPABASE_DB_URL='.Length)
    if ($dbUrl -notmatch [regex]::Escape($expectedRef)) { $failures += 'Database URL project identity mismatch' }
    if ($dbUrl -notmatch ':5432/') { $failures += 'Database URL must use Session Pooler port 5432' }
    if ($dbUrl -notmatch 'sslmode=require') { $failures += 'Database URL must require SSL' }
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $failures += 'Node is not on PATH' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { $failures += 'pnpm is not on PATH' }
if ($failures.Count) { $failures | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "Environment readiness: PASS ($expectedRef on $branch)"
