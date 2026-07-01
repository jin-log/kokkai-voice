#!/usr/bin/env node
/**
 * Win: ceosync pull 直後に ceo-sync から起動。未完了バッチがあれば --resume を走らせる。
 * スキップ: KOKKAI_SKIP_POST_PULL_BATCH=1
 */
import { openSync, writeSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const progressPath = path.join(root, "data/batch-force-progress.json");
const logDir = path.join(root, "logs");
const logPath = path.join(logDir, "batch-force-resume.log");

async function pendingCount() {
  const progress = JSON.parse(await readFile(progressPath, "utf8"));
  if (progress.autoRunOnWinPull === false) return 0;
  const exclude = new Set(progress.exclude ?? ["index", "parked", "kishida-resign"]);
  const completed = new Set(progress.completed ?? []);
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(path.join(root, "data/articles"));
  const all = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((s) => !exclude.has(s));
  return all.filter((s) => !completed.has(s)).length;
}

async function main() {
  if (process.platform !== "win32") {
    return;
  }
  if (process.env.KOKKAI_SKIP_POST_PULL_BATCH === "1") {
    console.log("post-pull-batch: skipped (KOKKAI_SKIP_POST_PULL_BATCH=1)");
    return;
  }

  let pending;
  try {
    pending = await pendingCount();
  } catch {
    return;
  }
  if (pending < 1) {
    console.log("post-pull-batch: 未完了なし");
    return;
  }

  await mkdir(logDir, { recursive: true });
  const log = openSync(logPath, "a");
  const stamp = `\n=== ${new Date().toISOString()} resume start (${pending} pending) ===\n`;
  writeSync(log, stamp);

  console.log(`post-pull-batch: 未完了 ${pending} 件 — バックグラウンドで開始`);
  console.log(`  ログ: ${logPath}`);

  const child = spawn(
    process.execPath,
    [path.join(root, "scripts/run-all-force.mjs"), "--resume"],
    {
      cwd: root,
      detached: true,
      stdio: ["ignore", log, log],
      windowsHide: true,
    },
  );
  child.unref();
}

main().catch((e) => {
  console.error("post-pull-batch:", e);
  process.exit(1);
});
