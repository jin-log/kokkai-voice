#!/usr/bin/env node
/**
 * 全案件ゲート一括（timeline enrich → prosCons → X → 確認）
 * node scripts/finish-all-gates.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, { allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: "inherit", shell: true });
    p.on("close", (code) => {
      if (code === 0 || allowFail) resolve(code);
      else reject(new Error(`${cmd} exit ${code}`));
    });
  });
}

async function main() {
  console.log("1/5 enrich-timeline-all");
  await run("node", ["scripts/enrich-timeline-all.mjs"]);
  console.log("2/5 apply-proscons-all");
  await run("node", ["scripts/apply-proscons-all.mjs"]);
  console.log("3/5 improve-timeline-summaries");
  await run("node", ["scripts/improve-timeline-summaries.mjs"]);
  console.log("4/5 finish-x-gates");
  await run("node", ["scripts/finish-x-gates.mjs"]);
  console.log("5/5 check-case-page --all");
  const code = await run("node", ["scripts/check-case-page.mjs", "--all"], { allowFail: true });
  if (code !== 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
