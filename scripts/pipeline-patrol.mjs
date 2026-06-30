#!/usr/bin/env node
/**
 * 品質巡回 — 未完了記事を常時監視し pipeline-autorun を繰り返す
 *
 * Usage:
 *   npm run pipeline:patrol
 *   npm run pipeline:patrol -- --interval 120
 *   npm run pipeline:patrol -- --once
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { autorunLog, runAutorunCycle, parseAgentFilter } from "../src/lib/pipeline-autorun-core.mjs";
import { getPatrolPauseState } from "../src/lib/patrol-pause.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "data/pipeline-patrol.json");

const args = process.argv.slice(2);
const once = args.includes("--once");
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const intervalSec = Number(
  args.includes("--interval") ? args[args.indexOf("--interval") + 1] : 120,
);
const intervalMs = Math.max(30, intervalSec) * 1000;
const pausePollMs = Math.max(15, Number(args.includes("--pause-poll") ? args[args.indexOf("--pause-poll") + 1] : 60)) * 1000;
const maxRounds = Number(args.includes("--rounds") ? args[args.indexOf("--rounds") + 1] : 5);
const batchSize = Number(args.includes("--batch") ? args[args.indexOf("--batch") + 1] : 5);
const batchOffsetArg = args.includes("--batch-offset")
  ? Number(args[args.indexOf("--batch-offset") + 1])
  : null;
const { skipAgents, onlyAgents } = parseAgentFilter(args);

let cycle = 0;
let stopping = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeState(extra = {}) {
  const payload = {
    running: !stopping,
    startedAt: extra.startedAt,
    lastCycleAt: new Date().toISOString(),
    cycle,
    intervalSec: intervalMs / 1000,
    maxRoundsPerSlug: maxRounds,
    batchSize,
    ...extra,
  };
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function runCycle(startedAt) {
  cycle += 1;
  await autorunLog(`patrol cycle #${cycle} start`);
  const result = await runAutorunCycle({
    slugFilter: slugArg ?? undefined,
    maxRounds,
    batchSize: slugArg ? 0 : batchSize,
    batchOffset: batchOffsetArg ?? (cycle - 1) * batchSize,
    skipAgents,
    onlyAgents,
  });
  await autorunLog(
    `patrol cycle #${cycle} — processed ${result.summary.processed}, completed ${result.summary.completed}, gold ${result.summary.overallGoldPct}%`,
  );
  await writeState({
    startedAt,
    lastCycle: {
      processed: result.summary.processed,
      incompleteTotal: result.summary.incompleteTotal,
      completed: result.summary.completed,
      overallGoldPct: result.summary.overallGoldPct,
      overallGatePct: result.summary.overallGatePct,
      qualityFailed: result.summary.qualityFailed,
      incompleteSlugs: result.incomplete.map((r) => r.slug),
    },
  });
  return result;
}

async function main() {
  const startedAt = new Date().toISOString();
  await autorunLog(`pipeline-patrol start interval=${intervalMs / 1000}s rounds=${maxRounds}`);
  await writeState({ startedAt, running: true });

  process.on("SIGINT", () => {
    stopping = true;
    autorunLog("patrol SIGINT — 次サイクル後に停止").catch(() => {});
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });

  do {
    const pause = await getPatrolPauseState();
    if (pause.paused) {
      await autorunLog(
        `patrol paused (${pause.reason}${pause.detail ? `: ${pause.detail}` : ""}) — retry in ${pausePollMs / 1000}s`,
      );
      await writeState({
        startedAt,
        paused: true,
        pausedReason: pause.reason,
        pausedDetail: pause.detail ?? null,
      });
      if (once || stopping) break;
      await sleep(pausePollMs);
      continue;
    }

    await runCycle(startedAt);
    if (once || stopping) break;
    await autorunLog(`patrol sleep ${intervalMs / 1000}s`);
    await sleep(intervalMs);
  } while (!stopping);

  await writeState({ startedAt, running: false, stoppedAt: new Date().toISOString() });
  await autorunLog("pipeline-patrol stop");
}

main().catch(async (err) => {
  await autorunLog(`patrol fatal: ${err instanceof Error ? err.message : String(err)}`);
  await writeState({ running: false, stoppedAt: new Date().toISOString(), error: String(err) });
  process.exit(1);
});
