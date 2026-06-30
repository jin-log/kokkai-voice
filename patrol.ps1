# ローカル Xスクショ巡回 — 絶対停止禁止（OBS・手動pause以外）
# Usage: .\patrol.ps1
$Root = $PSScriptRoot
Set-Location $Root
$PidFile = Join-Path $Root "data\.patrol-daemon.pid"
$StateFile = Join-Path $Root "data\pipeline-patrol-daemon.json"
$WatchdogPidFile = Join-Path $Root "data\.patrol-watchdog.pid"
$LogFile = Join-Path $Root "docs\pipeline-autorun.log"
$MaxStaleSec = 900

function Test-DaemonHealthy {
  if (-not (Test-Path $PidFile)) { return $false }
  $raw = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $raw) { return $false }
  $procId = 0
  if (-not [int]::TryParse($raw.Trim(), [ref]$procId)) { return $false }
  if ($procId -le 0) { return $false }
  if ($null -eq (Get-Process -Id $procId -ErrorAction SilentlyContinue)) { return $false }
  if (Test-Path $StateFile) {
    try {
      $state = Get-Content $StateFile -Raw | ConvertFrom-Json
      if ($state.lastHeartbeatAt) {
        $hb = [DateTime]::Parse($state.lastHeartbeatAt)
        $age = (Get-Date).ToUniversalTime() - $hb.ToUniversalTime()
        if ($age.TotalSeconds -gt $MaxStaleSec) { return $false }
      }
    } catch {}
  }
  return $true
}

function Start-WatchdogLoop {
  if (Test-Path $WatchdogPidFile) {
    $wraw = Get-Content $WatchdogPidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    $wid = 0
    if ([int]::TryParse($wraw.Trim(), [ref]$wid) -and $wid -gt 0) {
      if ($null -ne (Get-Process -Id $wid -ErrorAction SilentlyContinue)) { return }
    }
  }
  $p = Start-Process node -ArgumentList "scripts/patrol-local-watchdog.mjs" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Set-Content -Path $WatchdogPidFile -Value $p.Id
}

if (-not (Test-DaemonHealthy)) {
  Remove-Item $PidFile -ErrorAction SilentlyContinue
  $PatrolCmd = "Set-Location '$Root'; npm run pipeline:patrol:daemon -- --agents debugger --interval 300 --batch 3"
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", $PatrolCmd)
  Start-Sleep -Seconds 2
}

Start-WatchdogLoop

if (Test-DaemonHealthy) {
  Write-Host "Local patrol: daemon + watchdog (never-stop policy)"
  Write-Host "Pause only: OBS or data/patrol-pause-until.json"
  Write-Host "Log: $LogFile"
} else {
  Write-Host "Failed to start daemon. Check: $LogFile"
  exit 1
}
