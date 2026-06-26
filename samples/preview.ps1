# kokkai-voice サンプル（固定ポート 8770）
$dir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Write-Host "kokkai-voice sample: http://localhost:8770/"
Set-Location $dir
npx --yes serve $dir -l 8770
