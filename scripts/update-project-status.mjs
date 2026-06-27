#!/usr/bin/env node
/**
 * 完成度 JSON を更新（ビルド前・手動確認用）
 * Usage:
 *   node scripts/update-project-status.mjs --print
 *   node scripts/update-project-status.mjs --deployed
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";
import { root } from "../src/lib/page-ready.mjs";

const outPath = path.join(root, "data/project-status.json");

if (process.argv.includes("--deployed")) {
  const status = await refreshProjectStatus();
  status.deployedAt = new Date().toISOString();
  await writeFile(outPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(`deployedAt: ${status.deployedAt} · ${status.overallGoldPct}%`);
  process.exit(0);
}

const status = await refreshProjectStatus();

if (process.argv.includes("--print") || !process.argv.includes("--quiet")) {
  console.log(`完成度: ${status.overallGoldPct}%（公開 ${status.publishedCount}/${status.activeCount}）`);
  if (status.deltaGoldPct != null && status.deltaGoldPct !== 0) {
    const sign = status.deltaGoldPct > 0 ? "+" : "";
    console.log(`  前回比: ${sign}${status.deltaGoldPct}%`);
  }
  console.log(`更新: ${status.generatedAt}`);
  for (const s of status.slugs) {
    console.log(`  ${s.slug}: 100%=${s.goldPct}% 公開=${s.published ? "○" : "×"}`);
  }
}
