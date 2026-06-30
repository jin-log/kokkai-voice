# Xスクショ専用ローカル巡回（Playwright + Xログインが必要なためサーバー不可）
# 軽い巡回（記事・X URL・法務）は GitHub Actions「品質巡回（サーバー）」
# Usage: .\patrol.ps1
$Root = $PSScriptRoot
Set-Location $Root
$PidFile = Join-Path $Root "data\.patrol-daemon.pid"
$LogFile = Join-Path $Root "docs\pipeline-autorun.log"

function Test-DaemonAlive {
  if (-not (Test-Path $PidFile)) { return $false }
  $raw = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $raw) { return $false }
  $procId = 0
  if (-not [int]::TryParse($raw.Trim(), [ref]$procId)) { return $false }
  if ($procId -le 0) { return $false }
  return $null -ne (Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

if (Test-DaemonAlive) {
  Write-Host "Patrol daemon already running (pid $(Get-Content $PidFile -First 1))"
  Write-Host "Log: $LogFile"
  exit 0
}

$PatrolCmd = "Set-Location '$Root'; npm run pipeline:patrol:daemon -- --agents debugger --interval 300 --batch 3"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $PatrolCmd)
Start-Sleep -Seconds 2

if (Test-DaemonAlive) {
  Write-Host "X screenshot patrol started (debugger only, 5min interval)"
  Write-Host "Article/X/legal patrol runs on GitHub Actions every 30min"
  Write-Host "Log: $LogFile"
  Write-Host "Stop: Ctrl+C in the daemon PowerShell window"
} else {
  Write-Host "Failed to start. Check: $LogFile"
  exit 1
}
