# GitHub Actions workflow を .github/workflows/ に配置（workflow スコープ付き PAT で push する用）
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$src = Join-Path $root "ops\github-workflows"
$dest = Join-Path $root ".github\workflows"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item (Join-Path $src "*.yml") $dest -Force
Write-Host "OK copied to .github/workflows/"
Get-ChildItem $dest -Filter "marketing-*.yml","post-prerelease*.yml" | ForEach-Object { $_.Name }
