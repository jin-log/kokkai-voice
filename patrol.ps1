# ローカル Xスクショ巡回 — 絶対停止禁止（OBS・手動pause以外）
# Usage: .\patrol.ps1
$Root = $PSScriptRoot
Set-Location $Root
$PidFile = Join-Path $Root "data\.patrol-daemon.pid"
$StateFile = Join-Path $Root "data\pipeline-patrol-daemon.json"
$CapturePidFile = Join-Path $Root "data\.x-capture-daemon.pid"
$CaptureStateFile = Join-Path $Root "data\x-capture-daemon.json"
$WatchdogPidFile = Join-Path $Root "data\.patrol-watchdog.pid"
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

function Start-PatrolDaemon {
  if (Test-ProcessHealthy $PidFile $StateFile) { return }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
  $p = Start-Process node -ArgumentList @(
    "scripts/pipeline-patrol-daemon.mjs",
    "--agents", "debugger",
    "--interval", "60",
    "--batch", "3"
  ) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  if ($p) { Set-Content -Path $PidFile -Value $p.Id -ErrorAction SilentlyContinue }
}

function Start-XCaptureDaemon {
  if (Test-ProcessHealthy $CapturePidFile $CaptureStateFile) { return }
  Remove-Item $CapturePidFile -ErrorAction SilentlyContinue
  $p = Start-Process node -ArgumentList @(
    "scripts/x-capture-daemon.mjs",
    "--poll", "30",
    "--limit", "20"
  ) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  if ($p) { Set-Content -Path $CapturePidFile -Value $p.Id -ErrorAction SilentlyContinue }
}

Start-PatrolDaemon
Start-XCaptureDaemon
Start-Sleep -Seconds 2
Start-WatchdogLoop

$WatchdogTaskName = "kokkai-voice-patrol-watchdog"
if (-not (Get-ScheduledTask -TaskName $WatchdogTaskName -ErrorAction SilentlyContinue)) {
  try {
    & (Join-Path $Root "scripts\install-patrol-watchdog.ps1")
  } catch {}
}

$patrolOk = Test-ProcessHealthy $PidFile $StateFile
$captureOk = Test-ProcessHealthy $CapturePidFile $CaptureStateFile

if ($patrolOk -and $captureOk) {
  Write-Host "Local patrol: patrol-daemon + x-capture-daemon + watchdog (never-stop)"
  Write-Host "Pause only: OBS or data/patrol-pause-until.json"
  Write-Host "Log: $LogFile"
} else {
  Write-Host "Failed to start. patrol=$patrolOk x-capture=$captureOk Log: $LogFile"
  exit 1
}
