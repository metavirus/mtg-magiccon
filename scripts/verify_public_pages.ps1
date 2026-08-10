$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$publishRoot = Join-Path $repoRoot 'tmp\gh-pages'
$publishIndexPath = Join-Path $publishRoot 'index.html'
$publicUrl = 'https://metavirus.github.io/mtg-magiccon/'

if (-not (Test-Path -LiteralPath $publishIndexPath)) {
  throw "Missing gh-pages index at $publishIndexPath. Run pnpm publish:pages first."
}

$publishIndex = Get-Content -Raw -LiteralPath $publishIndexPath
$assetPattern = 'assets/[A-Za-z0-9._-]+'
$expectedAssets = [System.Text.RegularExpressions.Regex]::Matches($publishIndex, $assetPattern) |
  ForEach-Object { $_.Value } |
  Select-Object -Unique

if (-not $expectedAssets -or $expectedAssets.Count -eq 0) {
  throw 'No hashed assets found in tmp/gh-pages/index.html.'
}

$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$uri = "$publicUrl?verify=$cacheBust"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing -Headers @{ 'Cache-Control' = 'no-cache' }
$publicIndex = $response.Content
$publicAssets = [System.Text.RegularExpressions.Regex]::Matches($publicIndex, $assetPattern) |
  ForEach-Object { $_.Value } |
  Select-Object -Unique

if (Compare-Object -ReferenceObject $expectedAssets -DifferenceObject $publicAssets) {
  $expected = $expectedAssets -join ', '
  $actual = $publicAssets -join ', '
  throw "GitHub Pages public asset references do not match tmp/gh-pages. Expected: $expected. Public: $actual. This is usually Pages propagation or browser/service-worker cache lag, not a successful public publish yet."
}

Write-Host "GitHub Pages public verification: PASS ($uri)"
