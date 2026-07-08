#!/usr/bin/env node
/** 新規記事作成の履歴 — 管理画面でキーワードを忘れないため */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "data/article-create-log.json");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const slug = arg("slug");
const keyword = arg("keyword");
const title = arg("title");
const category = arg("category") || "国会";
const via = arg("via") || "workflow";
const status = arg("status") || "done";

if (!slug || !keyword) {
  console.error("Usage: node scripts/log-article-create.mjs --slug X --keyword Y [--title] [--category] [--via] [--status pending|done|failed]");
  process.exit(1);
}

/** @type {{ entries: object[] }} */
let log = { entries: [] };
try {
  log = JSON.parse(await readFile(logPath, "utf8"));
} catch {
  /* new */
}

const existing = log.entries.find((e) => e.slug === slug);
log.entries = log.entries.filter((e) => e.slug !== slug);
log.entries.unshift({
  slug,
  keyword,
  title: title || existing?.title || "",
  category,
  via,
  status,
  at: existing?.at || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
log.entries = log.entries.slice(0, 50);
log.updatedAt = new Date().toISOString();

await writeFile(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
console.log(`[log] ${slug} — ${keyword} [${status}]`);
