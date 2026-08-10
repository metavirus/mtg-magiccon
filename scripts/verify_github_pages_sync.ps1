$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$distRoot = Join-Path $repoRoot 'dist'
$publishRoot = Join-Path $repoRoot 'tmp\gh-pages'
$distIndexPath = Join-Path $distRoot 'index.html'
$publishIndexPath = Join-Path $publishRoot 'index.html'
$publish404Path = Join-Path $publishRoot '404.html'

if (-not (Test-Path -LiteralPath $distIndexPath)) {
  throw "Missing dist index at $distIndexPath. Run pnpm build:pages first."
}

if (-not (Test-Path -LiteralPath $publishIndexPath)) {
  throw "Missing gh-pages index at $publishIndexPath. Run pnpm sync:pages first."
}

if (-not (Test-Path -LiteralPath $publish404Path)) {
  throw "Missing gh-pages 404 at $publish404Path. Run pnpm sync:pages first."
}

$distIndex = Get-Content -Raw -LiteralPath $distIndexPath
$publishIndex = Get-Content -Raw -LiteralPath $publishIndexPath
$publish404 = Get-Content -Raw -LiteralPath $publish404Path

$assetPattern = 'assets/[A-Za-z0-9._-]+'
$distAssets = [System.Text.RegularExpressions.Regex]::Matches($distIndex, $assetPattern) | ForEach-Object { $_.Value } | Select-Object -Unique
$publishAssets = [System.Text.RegularExpressions.Regex]::Matches($publishIndex, $assetPattern) | ForEach-Object { $_.Value } | Select-Object -Unique
$publish404Assets = [System.Text.RegularExpressions.Regex]::Matches($publish404, $assetPattern) | ForEach-Object { $_.Value } | Select-Object -Unique

if (-not $distAssets -or $distAssets.Count -eq 0) {
  throw 'No hashed assets found in dist/index.html.'
}

if (Compare-Object -ReferenceObject $distAssets -DifferenceObject $publishAssets) {
  throw 'gh-pages index asset references do not match dist/index.html.'
}

if (Compare-Object -ReferenceObject $publishAssets -DifferenceObject $publish404Assets) {
  throw 'gh-pages 404.html asset references do not match gh-pages index.html.'
}

foreach ($asset in $publishAssets) {
  $publishAssetPath = Join-Path $publishRoot $asset
  if (-not (Test-Path -LiteralPath $publishAssetPath)) {
    throw "Referenced published asset is missing: $publishAssetPath"
  }
}

foreach ($requiredFile in @('.nojekyll')) {
  $path = Join-Path $publishRoot $requiredFile
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing published support file: $path"
  }
}

Write-Host 'GitHub Pages verification: PASS'
