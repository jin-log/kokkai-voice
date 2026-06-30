# kokkai-voice サンプル（固定ポート 8770）
$dir = $PSScriptRoot
if (-not $dir) { $dir = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $dir) { $dir = "C:\Users\bero1\Projects\kokkai-voice\samples" }
Write-Host "kokkai-voice sample: http://localhost:8770/"
Write-Host "case demo: http://localhost:8770/case/bouka-taisaku.html"
Write-Host "design directions: http://localhost:8770/design-directions.html"
Set-Location -LiteralPath $dir
npx --yes serve . -l 8770
