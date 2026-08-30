$ErrorActionPreference = 'Stop'

$secretPath = Join-Path (Get-Location) '.secrets/database.env'
$testPath = Join-Path (Get-Location) 'supabase/tests/catalog_rls.sql'

if (-not (Test-Path -LiteralPath $secretPath)) {
  throw 'Missing .secrets/database.env with SUPABASE_DB_URL.'
}
if (-not (Test-Path -LiteralPath $testPath)) {
  throw 'Missing supabase/tests/catalog_rls.sql.'
}

$dbLine = Get-Content -LiteralPath $secretPath | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
if (-not $dbLine) {
  throw 'Missing SUPABASE_DB_URL in .secrets/database.env.'
}

$dbUrl = $dbLine.Substring('SUPABASE_DB_URL='.Length)
$output = (& psql $dbUrl -X -t -A -v ON_ERROR_STOP=1 -f $testPath 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
  throw "Catalog database regression SQL failed to execute.`n$output"
}
if ($output -match '(?m)^not ok\b') {
  throw "Catalog database regression assertions failed.`n$output"
}
if ($output -notmatch '(?m)^1\.\.71\s*$') {
  throw "Catalog database regression plan did not complete.`n$output"
}

Write-Output 'Catalog database validation: PASS (71 live schema, RLS, grant, RPC, and value-kind assertions).'
