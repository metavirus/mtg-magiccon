$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path .).Path
$dist = Join-Path $repoRoot 'dist'

if (Test-Path -LiteralPath $dist) {
  $resolvedDist = (Resolve-Path -LiteralPath $dist).Path
  if ($resolvedDist -ne (Join-Path $repoRoot 'dist')) {
    throw "Refusing to clean unexpected dist path: $resolvedDist"
  }
  Get-ChildItem -LiteralPath $resolvedDist -Force |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

Write-Host 'dist clean: PASS'
