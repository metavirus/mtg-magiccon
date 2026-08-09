$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$distRoot = Join-Path $repoRoot 'dist'
$publishRoot = Join-Path $repoRoot 'tmp\gh-pages'
$assetsRoot = Join-Path $publishRoot 'assets'

if (-not (Test-Path -LiteralPath $distRoot)) {
  throw "Missing dist output at $distRoot. Run pnpm build:pages first."
}

if (-not (Test-Path -LiteralPath $publishRoot)) {
  throw "Missing gh-pages worktree at $publishRoot."
}

$expectedPrefix = (Join-Path $repoRoot 'tmp\gh-pages')
$resolvedPublishRoot = (Resolve-Path -LiteralPath $publishRoot).Path
if (-not $resolvedPublishRoot.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Unexpected publish root: $resolvedPublishRoot"
}

Get-ChildItem -LiteralPath $publishRoot -Force |
  Where-Object { $_.Name -notin @('.git', 'assets') } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

if (-not (Test-Path -LiteralPath $assetsRoot)) {
  New-Item -ItemType Directory -Path $assetsRoot | Out-Null
}

Get-ChildItem -LiteralPath $distRoot -Force |
  Where-Object { $_.Name -ne 'assets' } |
  ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $publishRoot -Recurse -Force }

Get-ChildItem -LiteralPath (Join-Path $distRoot 'assets') -Force |
  ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $assetsRoot -Recurse -Force }

Copy-Item -LiteralPath (Join-Path $publishRoot 'index.html') -Destination (Join-Path $publishRoot '404.html') -Force
New-Item -ItemType File -Path (Join-Path $publishRoot '.nojekyll') -Force | Out-Null

Write-Host 'GitHub Pages sync: PASS'
