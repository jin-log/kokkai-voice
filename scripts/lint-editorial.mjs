#!/usr/bin/env node
/**
 * 編集ルール違反チェック
 *   node scripts/lint-editorial.mjs --slug kishida-seiken-jisshi
 *   node scripts/lint-editorial.mjs --all
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintArticle } from "../src/lib/editorial-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const slugArg = arg("slug");
const all = process.argv.includes("--all");
const failOnBlocker = process.argv.includes("--fail-on-blocker");

async function loadSlug(slug) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  return JSON.parse(await readFile(p, "utf8"));
}

async function main() {
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  const slugs = slugArg ? [slugArg] : all ? index.slugs : [];
  if (!slugs.length) {
    console.error("Usage: --slug X | --all");
    process.exit(1);
  }

  let bad = 0;
  for (const slug of slugs) {
    let article;
    try {
      article = await loadSlug(slug);
    } catch {
      console.warn(`[skip] ${slug}`);
      continue;
    }
    const result = lintArticle(article);
    if (!result.ok) {
      bad++;
      console.log(`\n✗ ${slug} — blocker ${result.blockers.length}`);
      for (const v of result.blockers) {
        console.log(`  [${v.ruleId}] ${v.field}: ${v.line}`);
      }
    } else if (result.violations.length) {
      console.log(`\n△ ${slug} — warn ${result.violations.length}`);
      for (const v of result.violations) {
        console.log(`  [${v.ruleId}] ${v.field}: ${v.line}`);
      }
    } else {
      console.log(`✓ ${slug}`);
    }
  }

  if (failOnBlocker && bad > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
