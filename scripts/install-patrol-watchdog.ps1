# Windows タスクスケジューラに patrol ウォッチドッグを登録（5分ごと）
# Usage: .\scripts\install-patrol-watchdog.ps1
$Root = Split-Path $PSScriptRoot -Parent
$Watchdog = Join-Path $Root "patrol-watchdog.ps1"
$TaskName = "kokkai-voice-patrol-watchdog"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Already registered: $TaskName"
  exit 0
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Watchdog`""

$start = (Get-Date).AddMinutes(1)
$trigger = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

try {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Host "Registered: $TaskName (every 5 min)"
} catch {
  Write-Host "Register-ScheduledTask failed: $_"
  Write-Host "Fallback: schtasks"
  schtasks /Create /F /SC MINUTE /MO 5 /TN $TaskName /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Watchdog`""
}
