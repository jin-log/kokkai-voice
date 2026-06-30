#!/usr/bin/env node
/**
 * ローカル patrol ウォッチドッグ — 5分ごとにデーモン死活確認、死んでたら再起動
 * patrol.ps1 から別プロセスで起動（タスクスケジューラ不要）
 */
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { autorunLog } from "../src/lib/pipeline-autorun-core.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidPath = path.join(root, "data/.patrol-daemon.pid");
const statePath = path.join(root, "data/pipeline-patrol-daemon.json");
const logPath = path.join(root, "docs/pipeline-autorun.log");
const pollMs = 5 * 60 * 1000;
const maxStaleMs = 15 * 60 * 1000;

async function log(msg) {
  await autorunLog(`[watchdog] ${msg}`, logPath);
}

async function isDaemonHealthy() {
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

function startPatrolDaemon() {
  const script = path.join(root, "scripts", "pipeline-patrol-daemon.mjs");
  spawn(
    process.execPath,
    [script, "--agents", "debugger", "--interval", "300", "--batch", "3"],
    { cwd: root, detached: true, stdio: "ignore", shell: false },
  ).unref();
}

async function tick() {
  if (await isDaemonHealthy()) return;
  await log("daemon unhealthy — restarting");
  startPatrolDaemon();
}

await log(`local watchdog start poll=${pollMs / 1000}s`);
await tick();
setInterval(() => {
  tick().catch((e) => log(`tick error: ${e instanceof Error ? e.message : e}`));
}, pollMs);
