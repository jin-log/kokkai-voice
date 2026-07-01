#!/usr/bin/env bash
# ローカル品質巡回 — Mac/Linux（patrol.ps1 と同じ）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PID_FILE="data/.patrol-daemon.pid"
CAPTURE_PID_FILE="data/.x-capture-daemon.pid"

is_alive() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$pidfile")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

if ! is_alive "$PID_FILE"; then
  rm -f "$PID_FILE"
  nohup node scripts/pipeline-patrol-daemon.mjs --skip debugger --interval 120 --batch 5 \
    >> docs/pipeline-autorun.log 2>&1 &
  echo $! > "$PID_FILE"
fi

if ! is_alive "$CAPTURE_PID_FILE"; then
  rm -f "$CAPTURE_PID_FILE"
  nohup node scripts/x-capture-daemon.mjs --poll 30 --limit 20 \
    >> docs/pipeline-autorun.log 2>&1 &
  echo $! > "$CAPTURE_PID_FILE"
fi

if ! is_alive "data/.patrol-watchdog.pid"; then
  nohup node scripts/patrol-local-watchdog.mjs >> docs/pipeline-autorun.log 2>&1 &
  echo $! > "data/.patrol-watchdog.pid"
fi

echo "Local patrol: writer patrol + x-capture + watchdog (Mac/Win same)"
