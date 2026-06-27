#!/usr/bin/env node
/** data/articles/index.json に slug を追加 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugIdx = process.argv.indexOf("--slug");
const slug = slugIdx >= 0 ? process.argv[slugIdx + 1] : null;
if (!slug) {
  console.error("Usage: node scripts/register-article-index.mjs --slug <slug>");
  process.exit(1);
}

const indexPath = path.join(root, "data/articles/index.json");
const index = JSON.parse(await readFile(indexPath, "utf8"));
if (!index.slugs.includes(slug)) {
  index.slugs.unshift(slug);
  index.count = index.slugs.length;
}
index.updatedAt = new Date().toISOString();
await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`index.json: ${slug} 登録 (${index.count}件)`);
