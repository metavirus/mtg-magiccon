$ErrorActionPreference = 'Stop'

$Route = 'home'
$Port = 5173
$Width = 1600
$Height = 1000
$Query = ''
$OfflineReopen = $false
$ExpectText = ''
$ExpectImage = ''
$ExpectAssets = ''

$forwardedArgs = @($args | Where-Object { $_ -ne '--' })
for ($index = 0; $index -lt $forwardedArgs.Count; $index++) {
  switch -Regex ($forwardedArgs[$index]) {
    '^-Route$' { $index++; $Route = $forwardedArgs[$index]; continue }
    '^-Port$' { $index++; $Port = [int]$forwardedArgs[$index]; continue }
    '^-Width$' { $index++; $Width = [int]$forwardedArgs[$index]; continue }
    '^-Height$' { $index++; $Height = [int]$forwardedArgs[$index]; continue }
    '^-Query$' { $index++; $Query = $forwardedArgs[$index]; continue }
    '^-OfflineReopen$' { $OfflineReopen = $true; continue }
    '^-ExpectText$' { $index++; $ExpectText = $forwardedArgs[$index]; continue }
    '^-ExpectImage$' { $index++; $ExpectImage = $forwardedArgs[$index]; continue }
    '^-ExpectAssets$' { $index++; $ExpectAssets = $forwardedArgs[$index]; continue }
    default {
      if ($forwardedArgs[$index] -and -not $forwardedArgs[$index].StartsWith('-')) {
        $Route = $forwardedArgs[$index]
      }
    }
  }
}

$root = (git rev-parse --show-toplevel).Trim()
Set-Location -LiteralPath $root

$tempRoot = Join-Path $env:TEMP 'magiccon-ui-capture'
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$outLog = Join-Path $tempRoot 'vite.out.log'
$errLog = Join-Path $tempRoot 'vite.err.log'
$pidFile = Join-Path $tempRoot 'vite.pid'
$baseUrl = "http://127.0.0.1:$Port/"

function Test-AppHttp {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $baseUrl -TimeoutSec 2
    return ($response.StatusCode -eq 200)
  } catch {
    return $false
  }
}

$serverReused = $false
$pidValue = $null
if (Test-AppHttp) {
  $serverReused = $true
  $pidValue = 'existing'
} elseif (Test-Path -LiteralPath $pidFile) {
  $storedPid = (Get-Content -Raw -LiteralPath $pidFile).Trim()
  if ($storedPid -match '^\d+$') {
    $process = Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue
    if ($process -and (Test-AppHttp)) {
      $serverReused = $true
      $pidValue = [int]$storedPid
    }
  }
}

if (-not $serverReused) {
  $vite = Join-Path $root 'node_modules\.bin\vite.cmd'
  if (-not (Test-Path -LiteralPath $vite)) {
    throw "Local Vite executable is unavailable at $vite. Run dependency install first."
  }
  $distIndex = Join-Path $root 'dist\index.html'
  if (-not (Test-Path -LiteralPath $distIndex)) {
    throw 'Missing dist/index.html. Run pnpm build before UI capture.'
  }

  Remove-Item -LiteralPath $outLog, $errLog -Force -ErrorAction SilentlyContinue

  $process = Start-Process `
    -FilePath $vite `
    -ArgumentList @('preview', '--configLoader', 'runner', '--host', '127.0.0.1', '--port', "$Port", '--strictPort') `
    -WorkingDirectory $root `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru `
    -WindowStyle Hidden
  $pidValue = $process.Id
  Set-Content -LiteralPath $pidFile -Value $pidValue
}

$ready = $false
foreach ($attempt in 1..30) {
  if (Test-AppHttp) {
    $ready = $true
    break
  }
  if ($pidValue -is [int] -and -not (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
    break
  }
  Start-Sleep -Milliseconds 500
}
if (-not $ready) {
  Write-Output "UI_CAPTURE: FAIL server_not_ready pid=$pidValue"
  if (Test-Path -LiteralPath $outLog) { Get-Content -LiteralPath $outLog -Tail 40 }
  if (Test-Path -LiteralPath $errLog) { Get-Content -LiteralPath $errLog -Tail 40 }
  exit 1
}

$safeRoute = if ($Route.StartsWith('#')) { $Route.Substring(1) } else { $Route }
$safeFileRoute = $safeRoute -replace '[\\/:*?"<>|#&=]', '-'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$shotPath = Join-Path $tempRoot "$stamp-$safeFileRoute-$Width`x$Height.png"
$domPath = Join-Path $tempRoot "$stamp-$safeFileRoute-dom.html"
$textPath = Join-Path $tempRoot "$stamp-$safeFileRoute-text.txt"
$queryString = "preview=1&ui-capture=$stamp"
if ($Query) {
  $cleanQuery = $Query.Trim()
  if ($cleanQuery.StartsWith('?')) { $cleanQuery = $cleanQuery.Substring(1) }
  if ($cleanQuery.StartsWith('&')) { $cleanQuery = $cleanQuery.Substring(1) }
  if ($cleanQuery.Length -gt 0) {
    $queryString = "$queryString&$cleanQuery"
  }
}
$targetUrl = "$baseUrl`?$queryString#$safeRoute"

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
if (-not $node) { throw 'Node.js is unavailable.' }
$captureScript = Join-Path $root 'scripts\ui_capture_playwright.mjs'
$offlineReopenValue = if ($OfflineReopen) { 'true' } else { 'false' }
$captureEvidence = & $node.Source $captureScript `
  --url $targetUrl `
  --screenshot $shotPath `
  --dom $domPath `
  --text $textPath `
  --width $Width `
  --height $Height `
  --offline-reopen $offlineReopenValue `
  --expect-text $ExpectText `
  --expect-image $ExpectImage `
  --expect-assets $ExpectAssets
if ($LASTEXITCODE -ne 0) { throw "Playwright capture failed for $targetUrl" }
if (-not (Test-Path -LiteralPath $shotPath) -or -not (Test-Path -LiteralPath $domPath) -or -not (Test-Path -LiteralPath $textPath)) {
  throw "Playwright capture did not produce all expected artifacts for $targetUrl"
}

$text = (Get-Content -Raw -LiteralPath $textPath).Trim()

$shot = Get-Item -LiteralPath $shotPath
Write-Output "UI_CAPTURE: PASS"
Write-Output "route=$safeRoute"
Write-Output "url=$targetUrl"
Write-Output "server_pid=$pidValue"
Write-Output "server_reused=$serverReused"
Write-Output 'browser=playwright-chromium'
Write-Output "browser_evidence=$captureEvidence"
Write-Output "screenshot=$shotPath"
Write-Output "screenshot_bytes=$($shot.Length)"
Write-Output "dom=$domPath"
Write-Output "text=$textPath"
Write-Output "visible_text=$($text.Substring(0, [Math]::Min(500, $text.Length)))"
