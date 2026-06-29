# Win 本番デプロイ（サイト反映のみ）
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
node scripts/deploy-site.mjs
exit $LASTEXITCODE
