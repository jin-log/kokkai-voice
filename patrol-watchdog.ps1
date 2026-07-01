# 1分ごと: patrol + x-capture デーモンが死んでいたら即再起動
$Root = $PSScriptRoot
Set-Location $Root

$LogFile = Join-Path $Root "docs\pipeline-autorun.log"
$MaxStaleSec = 600

function Test-ProcessHealthy {
  param([string]$PidPath, [string]$StatePath)
  if (-not (Test-Path $PidPath)) { return $false }
  $raw = (Get-Content $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $raw) { return $false }
  $procId = 0
  if (-not [int]::TryParse($raw.Trim(), [ref]$procId)) { return $false }
  if ($procId -le 0) { return $false }
  if ($null -eq (Get-Process -Id $procId -ErrorAction SilentlyContinue)) { return $false }
  if (Test-Path $StatePath) {
    try {
      $state = Get-Content $StatePath -Raw | ConvertFrom-Json
      if ($state.lastHeartbeatAt) {
        $hb = [DateTime]::Parse($state.lastHeartbeatAt)
        $age = (Get-Date).ToUniversalTime() - $hb.ToUniversalTime()
        if ($age.TotalSeconds -gt $MaxStaleSec) { return $false }
      }
    } catch {}
  }
  return $true
}

$patrolOk = Test-ProcessHealthy (Join-Path $Root "data\.patrol-daemon.pid") (Join-Path $Root "data\pipeline-patrol-daemon.json")
$captureOk = Test-ProcessHealthy (Join-Path $Root "data\.x-capture-daemon.pid") (Join-Path $Root "data\x-capture-daemon.json")

if ($patrolOk -and $captureOk) {
  exit 0
}

$ts = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
$msg = if (-not $patrolOk -and -not $captureOk) { "patrol+x-capture unhealthy" }
       elseif (-not $patrolOk) { "patrol unhealthy" }
       else { "x-capture unhealthy" }
Add-Content -Path $LogFile -Value "[$ts] [watchdog] $msg — restarting"
Remove-Item (Join-Path $Root "data\.patrol-daemon.pid") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Root "data\.x-capture-daemon.pid") -ErrorAction SilentlyContinue
& (Join-Path $Root "patrol.ps1")
