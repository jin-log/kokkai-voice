#!/bin/bash
# Win からコピーした buffer.env を Mac の正しい場所へ置く
# Usage:
#   ./scripts/import-buffer-env.sh ~/Downloads/buffer.env
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-}"
DEST="$REPO/secrets/buffer.env"

if [ -z "$SRC" ]; then
  echo "使い方: ./scripts/import-buffer-env.sh <コピーした buffer.env のパス>"
  echo "例:     ./scripts/import-buffer-env.sh ~/Downloads/buffer.env"
  exit 1
fi
if [ ! -f "$SRC" ]; then
  echo "ファイルがありません: $SRC"
  exit 1
fi
if ! grep -q '^BUFFER_API_KEY=.\+' "$SRC"; then
  echo "BUFFER_API_KEY が空です。Win の buffer.env をそのままコピーしてください。"
  exit 1
fi

mkdir -p "$REPO/secrets"
cp "$SRC" "$DEST"
chmod 600 "$DEST"
echo "OK: $DEST に配置しました"
node "$REPO/scripts/check-buffer.mjs"
