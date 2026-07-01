#!/usr/bin/env node
/**
 * publishedAt があるのに pageReady=false になった記事を復旧する。
 *
 *   node scripts/restore-live-publish.mjs          # 一覧のみ
 *   node scripts/restore-live-publish.mjs --apply  # pageReady=true に戻す
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

const files = (await readdir(path.join(root, "data/articles"))).filter(
  (f) => f.endsWith(".json") && f !== "index.json" && f !== "parked.json",
);

const targets = [];
for (const f of files) {
  const slug = f.replace(/\.json$/, "");
  const articlePath = path.join(root, "data/articles", f);
  const article = JSON.parse(await readFile(articlePath, "utf8"));
  if (article.publishedAt && article.pageReady !== true) {
    targets.push({ slug, article, articlePath });
  }
}

if (!targets.length) {
  console.log("復旧対象なし");
  process.exit(0);
}

console.log(`復旧対象 ${targets.length} 件:`);
for (const t of targets) {
  console.log(`  - ${t.slug} (publishedAt=${t.article.publishedAt})`);
}

if (!apply) {
  console.log("\n適用するには --apply を付けて再実行");
  process.exit(0);
}

for (const t of targets) {
  t.article.pageReady = true;
  t.article.adminHidden = false;
  delete t.article.adminHiddenAt;
  delete t.article.adminHiddenBy;
  await writeFile(t.articlePath, `${JSON.stringify(t.article, null, 2)}\n`, "utf8");
  console.log(`OK: ${t.slug} → pageReady=true`);
}

await refreshProjectStatus();
console.log("project-status.json 更新済み");
