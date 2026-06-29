#!/usr/bin/env node
/**
 * 起動期 X 一括実行 — 昼3選 + 夜単体（熱い日のみ）
 *
 *   node scripts/post-x-launch.mjs --slot noon   # 12:00 JST
 *   node scripts/post-x-launch.mjs --slot evening # 19:00 JST
 *   node scripts/post-x-launch.mjs --slot both --dry-run
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slotIdx = args.indexOf("--slot");
const slot = slotIdx >= 0 ? args[slotIdx + 1] : "both";

function run(script) {
  return new Promise((resolve, reject) => {
    const extra = [];
    if (dryRun) extra.push("--dry-run");
    if (force) extra.push("--force");
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...extra], {
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
}

async function main() {
  if (slot === "noon" || slot === "both") {
    const c = await run("post-daily-digest.mjs");
    if (c !== 0 && !dryRun) process.exit(c);
  }
  if (slot === "evening" || slot === "both") {
    const c = await run("post-hot-single.mjs");
    if (c !== 0 && !dryRun) process.exit(c);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
