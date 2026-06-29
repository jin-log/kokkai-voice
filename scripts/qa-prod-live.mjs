#!/usr/bin/env node
/**
 * 本番公開中ページの HTTP 200 確認 → qaReview.status: ok
 *
 *   node scripts/qa-prod-live.mjs
 *   node scripts/qa-prod-live.mjs --slug bouka-taisaku
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");
const prodBase = "https://seiji1192.site";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const onlySlug = arg("--slug");

async function headOk(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return res.ok;
}

async function main() {
  const index = JSON.parse(await readFile(path.join(articlesDir, "index.json"), "utf8"));
  const now = new Date().toISOString();
  const slugs = onlySlug ? [onlySlug] : index.slugs ?? [];

  let okCount = 0;
  for (const slug of slugs) {
    const p = path.join(articlesDir, `${slug}.json`);
    let article;
    try {
      article = JSON.parse(await readFile(p, "utf8"));
    } catch {
      continue;
    }
    if (!article.pageReady || article.adminHidden) continue;

    const url = `${prodBase}/case/${slug}/`;
    const ok = await headOk(url);
    if (!ok) {
      console.error(`NG HTTP ${slug} ${url}`);
      continue;
    }

    article.qaReview = {
      status: "ok",
      agent: "site-debugger",
      checkedAt: now,
      note: `本番確認済（${url}）HTTP 200`,
    };
    await writeFile(p, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    console.log(`qa OK ${slug}`);
    okCount += 1;
  }

  await refreshProjectStatus();
  console.log(`qa-prod-live: ${okCount} article(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
