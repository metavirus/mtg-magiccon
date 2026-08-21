$ErrorActionPreference = 'Stop'

$secretPath = Join-Path (Get-Location) '.secrets/database.env'
if (-not (Test-Path $secretPath)) {
  throw "Missing .secrets/database.env with SUPABASE_DB_URL."
}

$dbLine = Get-Content $secretPath | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
if (-not $dbLine) {
  throw "Missing SUPABASE_DB_URL in .secrets/database.env."
}

$dbUrl = $dbLine.Substring('SUPABASE_DB_URL='.Length)

$sql = @"
with target_tables(table_name) as (
  values
    ('artist_import_batches'),
    ('artists'),
    ('artist_appearances'),
    ('artist_cards'),
    ('artist_card_printings'),
    ('artist_card_assessments'),
    ('artist_signing_interests')
)
select concat_ws('|',
  (
    select bool_and(c.relrowsecurity and c.relforcerowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join target_tables t on t.table_name = c.relname
    where n.nspname = 'public'
  ),
  (
    select count(*)
    from information_schema.role_table_grants g
    join target_tables t on t.table_name = g.table_name
    where g.table_schema = 'public'
      and g.grantee = 'anon'
  ),
  (
    select count(*)
    from pg_policies p
    join target_tables t on t.table_name = p.tablename
    where p.schemaname = 'public'
  ),
  (select count(*) from public.artists),
  (select count(*) from public.artist_appearances),
  (select count(*) from public.artist_cards),
  (select count(*) from public.artist_card_printings),
  (select count(*) from public.artist_card_assessments),
  (select count(*) from public.artist_import_batches)
);
"@

$proof = & psql $dbUrl -v ON_ERROR_STOP=1 -Atc $sql
if ($LASTEXITCODE -ne 0) {
  throw "psql validation query failed."
}

$parts = $proof -split '\|'
if ($parts.Count -ne 9) {
  throw "Unexpected validation result: $proof"
}

$rlsForced = $parts[0]
$anonGrants = [int]$parts[1]
$policyCount = [int]$parts[2]
$artistCount = [int]$parts[3]
$appearanceCount = [int]$parts[4]
$cardCount = [int]$parts[5]
$printingCount = [int]$parts[6]
$assessmentCount = [int]$parts[7]
$batchCount = [int]$parts[8]

if ($rlsForced -ne 't') {
  throw "Artist catalog RLS is not enabled and forced on every canonical table."
}

if ($anonGrants -ne 0) {
  throw "Artist catalog unexpectedly grants $anonGrants privileges to anon."
}

if ($policyCount -lt 10) {
  throw "Artist catalog policy count is unexpectedly low: $policyCount."
}

if ($artistCount -lt 4 -or $appearanceCount -lt 4 -or $cardCount -lt 1 -or $printingCount -lt 1 -or $assessmentCount -lt 1 -or $batchCount -lt 1) {
  throw "Artist catalog counts look under-hydrated: artists=$artistCount appearances=$appearanceCount cards=$cardCount printings=$printingCount assessments=$assessmentCount batches=$batchCount."
}

Write-Host "Artist catalog DB validation: PASS ($artistCount artists; $appearanceCount appearances; $cardCount cards; $printingCount printings; $assessmentCount assessments; $batchCount import batches; $policyCount policies; anon grants $anonGrants)."
