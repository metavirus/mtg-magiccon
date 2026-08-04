$ErrorActionPreference = 'Stop'

$dist = Join-Path (Resolve-Path .).Path 'dist'
$indexPath = Join-Path $dist 'index.html'
$manifestPath = Join-Path $dist 'manifest.webmanifest'

if (-not (Test-Path $indexPath)) {
  throw "Missing built index.html at $indexPath. Run pnpm build first."
}

$index = Get-Content -Raw -LiteralPath $indexPath
$index = $index.Replace('href="/', 'href="./')
$index = $index.Replace('src="/', 'src="./')
Set-Content -LiteralPath $indexPath -Value $index -NoNewline

if (Test-Path $manifestPath) {
  $manifest = Get-Content -Raw -LiteralPath $manifestPath
  $manifest = $manifest.Replace('"start_url":"/"', '"start_url":"."')
  $manifest = $manifest.Replace('"scope":"/"', '"scope":"."')
  $manifest = $manifest.Replace('"src":"/', '"src":"')
  Set-Content -LiteralPath $manifestPath -Value $manifest -NoNewline
}

Write-Host 'GitHub Pages asset paths: PASS'
