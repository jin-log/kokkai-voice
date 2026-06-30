# 5分ごと: ローカル patrol デーモンが死んでいたら即再起動
$Root = $PSScriptRoot
Set-Location $Root

$PidFile = Join-Path $Root "data\.patrol-daemon.pid"
$StateFile = Join-Path $Root "data\pipeline-patrol-daemon.json"
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

if (Test-DaemonHealthy) {
  exit 0
}

$ts = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
Add-Content -Path $LogFile -Value "[$ts] [watchdog] daemon unhealthy — restarting patrol"
Remove-Item $PidFile -ErrorAction SilentlyContinue
& (Join-Path $Root "patrol.ps1")
