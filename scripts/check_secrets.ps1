$ErrorActionPreference = 'Stop'
$tracked = git ls-files --cached --others --exclude-standard
$patterns = @(
  'sb_secret_[A-Za-z0-9_-]+',
  'SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+',
  'postgres(?:ql)?://[^\s]+:[^@\s]+@',
  'SUPABASE_DB_PASSWORD\s*=\s*\S+',
  'conventions\.leapevent\.tech/(?:c|mobile/get_qr)/'
)
$receiptArtifactPattern = '(?i)(^|/).*(?:receipt|order-(?:original|qr)|original-qr).*\.(?:html?|pdf|png|jpe?g|webp|gif)$'
if (
  'receipt-original.html' -notmatch $receiptArtifactPattern -or
  'public/order-qr.png' -notmatch $receiptArtifactPattern -or
  'public/logo.svg' -match $receiptArtifactPattern
) {
  throw 'Receipt artifact guard is not enforcing its intended boundary.'
}
$failures = @()
foreach ($file in $tracked) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
  $normalizedFile = $file.Replace('\', '/')
  if ($normalizedFile -match $receiptArtifactPattern) {
    $failures += "$file is a prohibited receipt artifact in the public repository"
  }
  $text = Get-Content -Raw -LiteralPath $file -ErrorAction SilentlyContinue
  if ($normalizedFile -eq 'scripts/check_secrets.ps1' -or $normalizedFile -match '\.test\.[^.]+$') { continue }
  foreach ($pattern in $patterns) {
    if ($text -match $pattern) {
      $failures += "$file matched prohibited secret pattern"
    }
  }
}
if ($failures.Count) { $failures | Sort-Object -Unique | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output 'Secret scan: PASS'
