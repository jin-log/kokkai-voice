# Xスクショ用 Chrome 起動（Profile 9 複製 + CDP 9333）
# Chrome 136+ は通常 User Data では CDP 不可 → x:capture と同じ自動起動を使う
if (-not $PSScriptRoot) {
  $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

node -e "import { loadChromeProfileConfig, ensureCaptureCdpReady } from './scripts/lib/chrome-profile.mjs'; const c=await loadChromeProfileConfig(); if(!c){console.error('NG chrome-profile.json'); process.exit(1)} const p=await ensureCaptureCdpReady(c); console.log('OK CDP', p, '- npm run x:capture -- --all --limit 20')"
