$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root "public\monitoring-intake.json"

if (-not (Test-Path -LiteralPath $path)) {
  Write-Host "Monitoring intake: SKIP (public/monitoring-intake.json absent)"
  exit 0
}

$raw = Get-Content -LiteralPath $path -Raw
try {
  $payload = $raw | ConvertFrom-Json
} catch {
  Write-Error "Monitoring intake: FAIL (invalid JSON): $($_.Exception.Message)"
  exit 1
}

$allowedKinds = @("site", "email", "newsletter", "manual")
$allowedSeverities = @("hot", "notice", "quiet")
$allowedDestinations = @("Home", "Activity", "Wallet", "Trip", "Explore", "Calendar", "Map", "Artists", "Notes")
$requiredAlertFields = @(
  "id",
  "kind",
  "severity",
  "destination",
  "attention",
  "title",
  "summary",
  "object",
  "source",
  "checkedAt",
  "status",
  "rationale",
  "nextAction"
)
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure([string] $message) {
  $script:failures.Add($message) | Out-Null
}

if (-not $payload.alerts -or $payload.alerts -isnot [System.Array]) {
  Add-Failure "alerts must be a non-empty array"
} else {
  $ids = @{}
  for ($i = 0; $i -lt $payload.alerts.Count; $i++) {
    $alert = $payload.alerts[$i]
    foreach ($field in $requiredAlertFields) {
      if (-not $alert.PSObject.Properties.Name.Contains($field)) {
        Add-Failure "alerts[$i] missing required field '$field'"
        continue
      }
      $value = [string]$alert.$field
      if ([string]::IsNullOrWhiteSpace($value)) {
        Add-Failure "alerts[$i].$field must be a non-empty string"
      }
    }

    if ($alert.id) {
      if ($ids.ContainsKey($alert.id)) {
        Add-Failure "duplicate alert id '$($alert.id)'"
      } else {
        $ids[$alert.id] = $true
      }
      if ($alert.id -notmatch '^[a-z0-9][a-z0-9-]*$') {
        Add-Failure "alert id '$($alert.id)' must be lowercase kebab-case"
      }
    }

    if ($alert.kind -and $allowedKinds -notcontains $alert.kind) {
      Add-Failure "alerts[$i].kind '$($alert.kind)' is not allowed"
    }
    if ($alert.severity -and $allowedSeverities -notcontains $alert.severity) {
      Add-Failure "alerts[$i].severity '$($alert.severity)' is not allowed"
    }
    if ($alert.destination -and $allowedDestinations -notcontains $alert.destination) {
      Add-Failure "alerts[$i].destination '$($alert.destination)' is not allowed"
    }
    if ($alert.destination -eq "Home" -and $alert.severity -eq "quiet") {
      Add-Failure "alerts[$i] routes a quiet finding to Home; quiet checks belong in Activity or the affected object"
    }

    $joined = (($requiredAlertFields | ForEach-Object { [string]$alert.$_ }) -join " ")
    if ($joined -match '(?i)\b(confirm(?:ation)?|reservation|booking|pin|code)\s*(number|value|#|:)\s*[A-Z0-9]{5,}\b') {
      Add-Failure "alerts[$i] may contain a private confirmation/reservation/code value; tracked monitoring intake must stay sanitized"
    }
    if ($joined -match '(?i)\b(full email|entire email|message body|qr code|barcode)\b') {
      Add-Failure "alerts[$i] appears to reference storing full private artifacts in tracked intake"
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host "Monitoring intake: FAIL"
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host "Monitoring intake: PASS ($($payload.alerts.Count) alerts)"
