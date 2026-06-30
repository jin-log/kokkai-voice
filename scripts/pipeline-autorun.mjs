#!/usr/bin/env node
/**
 * パイプライン自動実行 — 1回分
 *
 * Usage:
 *   npm run pipeline:autorun
 *   npm run pipeline:autorun -- --slug case-mqzxj4ro
 */
import { autorunLog, runAutorunCycle, parseAgentFilter } from "../src/lib/pipeline-autorun-core.mjs";

const args = process.argv.slice(2);
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const { skipAgents, onlyAgents } = parseAgentFilter(args);

async function main() {
  await autorunLog("pipeline-autorun start (quality-aware)");
  const cycle = await runAutorunCycle({
    slugFilter: slugArg ?? undefined,
    maxRounds: 3,
    skipAgents,
    onlyAgents,
  });
  await autorunLog(
    `done — gold ${cycle.summary.overallGoldPct}% gate ${cycle.summary.overallGatePct}% quality NG ${cycle.summary.qualityFailed}/${cycle.summary.activeCount}`,
  );

  if (cycle.incomplete.length > 0) {
    await autorunLog(`incomplete: ${cycle.incomplete.map((r) => r.slug).join(", ")}`);
    process.exitCode = 2;
  }
}

main().catch(async (err) => {
  await autorunLog(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
