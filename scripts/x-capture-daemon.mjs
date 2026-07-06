#!/usr/bin/env node
/**
 * Xスクショ専用デーモン — 止めない（OBS・手動pause以外）
 * pending があれば即 capture、なければ短い間隔で再チェック
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  autorunLog,
  countPendingScreenshots,
  runNodeScript,
} from "../src/lib/pipeline-autorun-core.mjs";
import { getPatrolPauseState } from "../src/lib/patrol-pause.mjs";
import { getXCapturePauseState } from "../src/lib/x-capture-pause.mjs";
import { ensureCaptureCdpReady, loadChromeProfileConfig } from "./lib/chrome-profile.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "data/x-capture-daemon.json");
const pidPath = path.join(root, "data/.x-capture-daemon.pid");
const logPath = path.join(root, "docs/pipeline-autorun.log");

const args = process.argv.slice(2);
const pollSec = Math.max(
  15,
  Number(args.includes("--poll") ? args[args.indexOf("--poll") + 1] : 30),
);
const captureLimit = Math.max(
  1,
  Number(args.includes("--limit") ? args[args.indexOf("--limit") + 1] : 20),
);
const restartDelaySec = Math.max(
  5,
  Number(args.includes("--restart-delay") ? args[args.indexOf("--restart-delay") + 1] : 10),
);

const startedAt = new Date().toISOString();
let cycle = 0;
let captureRuns = 0;
let stopping = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function log(msg) {
  await autorunLog(`[x-capture] ${msg}`, logPath);
}

async function writeState(extra = {}) {
  const payload = {
    running: !stopping,
    pid: process.pid,
    startedAt,
    cycle,
    captureRuns,
    pollSec,
    captureLimit,
    lastHeartbeatAt: new Date().toISOString(),
    policy: "never-stop-except-obs-or-manual-pause",
    ...extra,
  };
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(pidPath, `${process.pid}\n`, "utf8");
}

async function runCaptureBatch(pending) {
  captureRuns += 1;
  await log(`capture start pending=${pending} limit=${captureLimit} run=#${captureRuns}`);
  const code = await runNodeScript("capture-x-screenshots.mjs", [
    "--all",
    "--limit",
    String(captureLimit),
  ]);
  await log(`capture done exit=${code}`);
  return code;
}

async function mainLoop() {
  const xPause = await getXCapturePauseState();
  if (xPause.paused) {
    await log(`disabled — ${xPause.reason || "paused"} (exit)`);
    await writeState({ running: false, paused: true, pausedReason: xPause.reason });
    stopping = true;
    return;
  }

  await log(`daemon start pid=${process.pid} poll=${pollSec}s limit=${captureLimit}`);
  const chromeCfg = await loadChromeProfileConfig();
  if (chromeCfg) {
    try {
      const port = await ensureCaptureCdpReady(chromeCfg);
      await log(`dedicated Chrome ready CDP ${port} (普段の Chrome とは別)`);
    } catch (err) {
      await log(`dedicated Chrome start warn: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await writeState({ running: true });

  process.on("SIGINT", () => {
    stopping = true;
    log("SIGINT — 停止要求").catch(() => {});
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });

  while (!stopping) {
    cycle += 1;
    const pause = await getPatrolPauseState();
    if (pause.paused) {
      await log(
        `paused (${pause.reason}${pause.detail ? `: ${pause.detail}` : ""}) — retry ${pollSec}s`,
      );
      await writeState({ paused: true, pausedReason: pause.reason });
      await sleep(pollSec * 1000);
      continue;
    }

    let pending = 0;
    try {
      pending = await countPendingScreenshots();
    } catch (err) {
      await log(`count error: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(restartDelaySec * 1000);
      continue;
    }

    if (pending > 0) {
      try {
        await runCaptureBatch(pending);
      } catch (err) {
        await log(`capture fatal: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(restartDelaySec * 1000);
        continue;
      }
      await writeState({ lastPending: pending, lastAction: "capture" });
      await sleep(5000);
      continue;
    }

    await log(`idle pending=0 — next check ${pollSec}s (cycle #${cycle})`);
    await writeState({ lastPending: 0, lastAction: "idle" });
    await sleep(pollSec * 1000);
  }

  await writeState({ running: false, stoppedAt: new Date().toISOString() });
  await log("stop");
}

async function runForever() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mainLoop();
      if (stopping) return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await log(`daemon fatal: ${msg} — restart in ${restartDelaySec}s`);
      await sleep(restartDelaySec * 1000);
      stopping = false;
    }
  }
}

runForever();
