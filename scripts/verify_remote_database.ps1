$ErrorActionPreference = 'Stop'
$expectedRef = 'pavjsexxbueuzhzgemgy'
$secretFile = '.secrets/database.env'
if (-not (Test-Path -LiteralPath $secretFile)) { throw "Create ignored $secretFile as documented; do not paste credentials into chat." }
$line = Get-Content -LiteralPath $secretFile | Where-Object { $_ -match '^SUPABASE_DB_URL=' } | Select-Object -First 1
if (-not $line) { throw 'SUPABASE_DB_URL is missing.' }
$dbUrl = $line.Substring('SUPABASE_DB_URL='.Length)
if ($dbUrl -notmatch $expectedRef -or $dbUrl -notmatch ':5432/' -or $dbUrl -notmatch 'sslmode=require') { throw 'Database identity/transport guard failed.' }
$psql = Get-Command psql -ErrorAction SilentlyContinue
$psqlPath = if ($psql) { $psql.Source } elseif (Test-Path -LiteralPath 'C:\Program Files\PostgreSQL\18\bin\psql.exe') { 'C:\Program Files\PostgreSQL\18\bin\psql.exe' } else { $null }
if (-not $psqlPath) { throw 'psql is unavailable.' }
& $psqlPath $dbUrl -v ON_ERROR_STOP=1 -f scripts/verify_remote_database.sql
