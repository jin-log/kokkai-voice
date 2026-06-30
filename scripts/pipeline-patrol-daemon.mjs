#!/usr/bin/env node
/**
 * 品質巡回デーモン — 絶対に止めない（OBS/手動pause は子プロセス側）
 */
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { autorunLog } from "../src/lib/pipeline-autorun-core.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "data/pipeline-patrol-daemon.json");
const pidPath = path.join(root, "data/.patrol-daemon.pid");
const logPath = path.join(root, "docs/pipeline-autorun.log");

const args = process.argv.slice(2);
const restartDelaySec = Math.max(
  5,
  Number(args.includes("--restart-delay") ? args[args.indexOf("--restart-delay") + 1] : 15),
);
const fatalRestartSec = Math.max(
  5,
  Number(args.includes("--fatal-restart") ? args[args.indexOf("--fatal-restart") + 1] : 15),
);
const patrolArgs = args.filter((a, i) => {
  if (a === "--restart-delay" || a === "--fatal-restart") return false;
  if (i > 0 && (args[i - 1] === "--restart-delay" || args[i - 1] === "--fatal-restart")) {
    return false;
  }
  return true;
});

let stopping = false;
let child = null;
let restartCount = 0;
let fatalCount = 0;
const startedAt = new Date().toISOString();

async function daemonLog(msg) {
  await autorunLog(`[daemon] ${msg}`, logPath);
}

async function writeDaemonState(extra = {}) {
  const payload = {
    running: !stopping,
    pid: process.pid,
    startedAt,
    restartCount,
    fatalCount,
    restartDelaySec,
    patrolArgs,
    lastHeartbeatAt: new Date().toISOString(),
    childPid: child?.pid ?? null,
    childRunning: child !== null && child.exitCode === null,
    policy: "never-stop-except-obs-or-manual-pause",
    ...extra,
  };
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(pidPath, `${process.pid}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnPatrol() {
  return new Promise((resolve) => {
    const script = path.join(root, "scripts", "pipeline-patrol.mjs");
    child = spawn(process.execPath, [script, ...patrolArgs], {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    writeDaemonState({ lastPatrolStartAt: new Date().toISOString() }).catch(() => {});
    child.on("close", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      child = null;
      resolve({ exitCode, signal });
    });
    child.on("error", () => {
      child = null;
      resolve({ exitCode: 1, signal: null });
    });
  });
}

async function heartbeatLoop() {
  while (!stopping) {
    await sleep(30_000);
    if (!stopping) await writeDaemonState();
  }
}

async function runDaemon() {
  await daemonLog(
    `start pid=${process.pid} restartDelay=${restartDelaySec}s args=${patrolArgs.join(" ") || "(none)"}`,
  );
  await writeDaemonState({ running: true });

  const hb = heartbeatLoop();

  process.on("SIGINT", () => {
    stopping = true;
    daemonLog("SIGINT — patrol 停止後にデーモン終了").catch(() => {});
    if (child) child.kill("SIGTERM");
  });
  process.on("SIGTERM", () => {
    stopping = true;
    if (child) child.kill("SIGTERM");
  });

  while (!stopping) {
    const { exitCode, signal } = await spawnPatrol();
    if (stopping) break;

    restartCount += 1;
    await daemonLog(
      `patrol exited code=${exitCode}${signal ? ` signal=${signal}` : ""} — restart #${restartCount} in ${restartDelaySec}s`,
    );
    await writeDaemonState({
      lastPatrolExit: { at: new Date().toISOString(), exitCode, signal },
    });

    await sleep(restartDelaySec * 1000);
  }

  stopping = true;
  await writeDaemonState({ running: false, stoppedAt: new Date().toISOString() });
  await daemonLog("stop");
  await hb;
}

async function runForever() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runDaemon();
      if (stopping) return;
    } catch (err) {
      fatalCount += 1;
      const msg = err instanceof Error ? err.message : String(err);
      await daemonLog(`fatal #${fatalCount}: ${msg} — daemon restart in ${fatalRestartSec}s`);
      await writeDaemonState({ running: true, lastFatal: { at: new Date().toISOString(), msg } });
      await sleep(fatalRestartSec * 1000);
      stopping = false;
      child = null;
    }
  }
}

runForever();
