$ErrorActionPreference = 'Stop'
$tracked = git ls-files --cached --others --exclude-standard
$patterns = @(
  'sb_secret_[A-Za-z0-9_-]+',
  'SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+',
  'postgres(?:ql)?://[^\s]+:[^@\s]+@',
  'SUPABASE_DB_PASSWORD\s*=\s*\S+'
)
$failures = @()
foreach ($file in $tracked) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
  $text = Get-Content -Raw -LiteralPath $file -ErrorAction SilentlyContinue
  foreach ($pattern in $patterns) {
    if ($text -match $pattern) {
      $failures += "$file matched prohibited secret pattern"
    }
  }
}
if ($failures.Count) { $failures | Sort-Object -Unique | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output 'Secret scan: PASS'
