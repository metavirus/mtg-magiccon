$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$distRoot = Join-Path $repoRoot 'dist'
$distIndexPath = Join-Path $distRoot 'index.html'
$publicUrl = 'https://metavirus.github.io/mtg-magiccon/'

if (-not (Test-Path -LiteralPath $distIndexPath)) {
  throw "Missing dist index at $distIndexPath. Run pnpm build:pages first."
}

$publishIndex = Get-Content -Raw -LiteralPath $distIndexPath
$assetPattern = 'assets/[A-Za-z0-9._-]+'
$expectedAssets = [System.Text.RegularExpressions.Regex]::Matches($publishIndex, $assetPattern) |
  ForEach-Object { $_.Value } |
  Select-Object -Unique

if (-not $expectedAssets -or $expectedAssets.Count -eq 0) {
  throw 'No hashed assets found in dist/index.html.'
}

$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$uri = "${publicUrl}?verify=$cacheBust"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing -Headers @{ 'Cache-Control' = 'no-cache' }
$publicIndex = $response.Content
$publicAssets = [System.Text.RegularExpressions.Regex]::Matches($publicIndex, $assetPattern) |
  ForEach-Object { $_.Value } |
  Select-Object -Unique

if (Compare-Object -ReferenceObject $expectedAssets -DifferenceObject $publicAssets) {
  $expected = $expectedAssets -join ', '
  $actual = $publicAssets -join ', '
  throw "GitHub Pages public asset references do not match the local Pages artifact in dist. Expected: $expected. Public: $actual. This is usually Pages workflow propagation or browser/service-worker cache lag, not a successful public publish yet."
}

Write-Host "GitHub Pages public verification: PASS ($uri)"
