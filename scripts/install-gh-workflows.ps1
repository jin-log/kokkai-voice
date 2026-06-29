# GitHub Actions workflow を .github/workflows/ に配置
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$src = Join-Path $root "ops\github-workflows"
$dest = Join-Path $root ".github\workflows"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem $src -Filter "*.yml" | Copy-Item -Destination $dest -Force
Write-Host "OK copied:"
Get-ChildItem $dest -Filter "*.yml" | ForEach-Object { $_.Name }
