$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$distRoot = Join-Path $repoRoot 'dist'
$distIndexPath = Join-Path $distRoot 'index.html'
$publicUrl = 'https://metavirus.github.io/mtg-magiccon/'

if (-not (Test-Path -LiteralPath $distIndexPath)) {
  throw "Missing dist index at $distIndexPath. Run pnpm build:pages first."
}

$publishIndex = Get-Content -Raw -LiteralPath $distIndexPath
$expectedShaMatch = [System.Text.RegularExpressions.Regex]::Match($publishIndex, '<meta name="magiccon-build-sha" content="([^"]+)" />')
if (-not $expectedShaMatch.Success) {
  throw 'No magiccon-build-sha meta tag found in dist/index.html. Run pnpm build:pages first.'
}
$expectedSha = $expectedShaMatch.Groups[1].Value
$assetPattern = 'assets/[A-Za-z0-9._-]+'
$expectedAssets = [System.Text.RegularExpressions.Regex]::Matches($publishIndex, $assetPattern) | ForEach-Object { $_.Value } | Select-Object -Unique

if (-not $expectedAssets -or $expectedAssets.Count -eq 0) {
  throw 'No hashed assets found in dist/index.html.'
}

$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$uri = "${publicUrl}?verify=$cacheBust"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing -Headers @{ 'Cache-Control' = 'no-cache' }
$publicIndex = $response.Content
$publicShaMatch = [System.Text.RegularExpressions.Regex]::Match($publicIndex, '<meta name="magiccon-build-sha" content="([^"]+)" />')
if (-not $publicShaMatch.Success) {
  throw 'No magiccon-build-sha meta tag found in public GitHub Pages HTML. The public page is still on a pre-workflow build.'
}
$publicSha = $publicShaMatch.Groups[1].Value

if ($expectedSha -ne $publicSha) {
  throw "GitHub Pages public build SHA does not match the local Pages artifact. Expected: $expectedSha. Public: $publicSha. This is usually Pages workflow propagation or browser/service-worker cache lag, not a successful public publish yet."
}

$publicAssets = [System.Text.RegularExpressions.Regex]::Matches($publicIndex, $assetPattern) | ForEach-Object { $_.Value } | Select-Object -Unique
foreach ($asset in $publicAssets) {
  $assetUri = [System.Uri]::new([System.Uri]$publicUrl, $asset)
  $assetResponse = Invoke-WebRequest -Uri $assetUri.AbsoluteUri -Method Head -UseBasicParsing -Headers @{ 'Cache-Control' = 'no-cache' }
  if ($assetResponse.StatusCode -lt 200 -or $assetResponse.StatusCode -ge 400) {
    throw "Public asset did not load: $($assetUri.AbsoluteUri) returned $($assetResponse.StatusCode)."
  }
}

Write-Host "GitHub Pages public verification: PASS ($uri)"
