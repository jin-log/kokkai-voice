#!/usr/bin/env node
/**
 * ローカル patrol ウォッチドッグ — 1分ごとにデーモン死活確認、死んでたら patrol.ps1 で再起動
 */
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { autorunLog } from "../src/lib/pipeline-autorun-core.mjs";
import { getXCapturePauseState } from "../src/lib/x-capture-pause.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const patrolPidPath = path.join(root, "data/.patrol-daemon.pid");
const patrolStatePath = path.join(root, "data/pipeline-patrol-daemon.json");
const capturePidPath = path.join(root, "data/.x-capture-daemon.pid");
const captureStatePath = path.join(root, "data/x-capture-daemon.json");
const logPath = path.join(root, "docs/pipeline-autorun.log");
const pollMs = 60 * 1000;
const maxStaleMs = 10 * 60 * 1000;

async function log(msg) {
  await autorunLog(`[watchdog] ${msg}`, logPath);
}

async function isProcessHealthy(pidPath, statePath) {
  let pid = 0;
  try {
    const raw = await readFile(pidPath, "utf8");
    pid = Number.parseInt(raw.trim(), 10);
  } catch {
    return false;
  }
  if (!pid) return false;

  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (state.lastHeartbeatAt) {
      const age = Date.now() - new Date(state.lastHeartbeatAt).getTime();
      if (age > maxStaleMs) return false;
    }
  } catch {
    // pid alive but no state — accept
  }
  return true;
}

function restartPatrolStack() {
  const ps1 = path.join(root, "patrol.ps1");
  spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", ps1],
    { cwd: root, detached: true, stdio: "ignore", shell: false },
  ).unref();
}

async function tick() {
  const patrolOk = await isProcessHealthy(patrolPidPath, patrolStatePath);
  const xPause = await getXCapturePauseState();
  const captureOk =
    xPause.paused || (await isProcessHealthy(capturePidPath, captureStatePath));
  if (patrolOk && captureOk) return;
  const parts = [];
  if (!patrolOk) parts.push("patrol");
  if (!xPause.paused && !captureOk) parts.push("x-capture");
  await log(`${parts.join("+")} unhealthy — restarting stack`);
  restartPatrolStack();
}

await log(`local watchdog start poll=${pollMs / 1000}s`);
await tick();
setInterval(() => {
  tick().catch((e) => log(`tick error: ${e instanceof Error ? e.message : e}`));
}, pollMs);
