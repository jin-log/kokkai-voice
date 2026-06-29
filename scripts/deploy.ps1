# Win 本番デプロイ
# Wrangler OAuth 利用時は API トークン env を外してから deploy する（pipeline-autorun と同じ）
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
npm run deploy
exit $LASTEXITCODE
