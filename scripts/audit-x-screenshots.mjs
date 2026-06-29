#!/usr/bin/env node
/**
 * 壊れた X スクショ検出（真っ黒・Xロゴのみ等）
 *
 * Usage: node scripts/audit-x-screenshots.mjs [--json]
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditScreenshotFile } from "./lib/x-screenshot-audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "public/assets/x-screenshots");
const articlesDir = path.join(root, "data/articles");

async function findArticleUsage(statusId) {
  const files = await readdir(articlesDir);
  const hits = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await readFile(path.join(articlesDir, f), "utf8");
    if (raw.includes(statusId)) {
      hits.push(f.replace(/\.json$/, ""));
    }
  }
  return hits;
}

async function main() {
  const files = (await readdir(dir)).filter((f) => /^\d+\.png$/i.test(f)).sort();
  /** @type {Awaited<ReturnType<typeof auditImage>>[]} */
  const results = [];
  for (const f of files) {
    results.push(await auditScreenshotFile(path.join(dir, f)));
  }

  const bad = results.filter((r) => r.bad);
  const enriched = [];
  for (const r of bad) {
    enriched.push({ ...r, articles: await findArticleUsage(r.id) });
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(enriched, null, 2));
    return;
  }

  console.log(`[audit] total=${files.length} bad=${bad.length}`);
  for (const r of enriched) {
    console.log(
      `  BAD ${r.id} ${r.width}x${r.height} ${r.bytes}B dark=${r.darkRatio} [${r.reasons.join(",")}] articles=${r.articles.join(",") || "?"}`,
    );
  }
  if (bad.length === 0) console.log("  問題なし");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
