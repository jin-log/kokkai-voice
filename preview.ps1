# 政治なう ローカルプレビュー（Glass 右ペイン用）
# 用法: .\preview.ps1
$Port = 8793
$Root = $PSScriptRoot
Set-Location $Root
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root'; npm run dev -- --port $Port --host"
  Start-Sleep -Seconds 4
}
Write-Host "http://localhost:$Port/dev/links/"
