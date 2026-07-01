#!/usr/bin/env node
/**
 * Run complete-article --force for all articles except excluded slugs.
 * Usage: node scripts/run-all-force.mjs [--exclude slug1,slug2]
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const excludeArg = process.argv.find((a) => a.startsWith("--exclude="));
const exclude = new Set(
  (excludeArg?.slice("--exclude=".length) || "index,parked,kishida-resign")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function runSlug(slug) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts/complete-article.mjs"), "--slug", slug, "--force"],
      { cwd: root, stdio: "inherit" },
    );
    child.on("close", (code) => resolve({ slug, code: code ?? 1 }));
  });
}

async function main() {
  const files = await readdir(path.join(root, "data/articles"));
  const slugs = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((s) => !exclude.has(s))
    .sort();

  console.log(`=== complete-article --force × ${slugs.length} 件 ===\n`);
  const results = [];
  for (const slug of slugs) {
    console.log(`\n>>> ${slug}`);
    results.push(await runSlug(slug));
  }

  const ok = results.filter((r) => r.code === 0);
  const ng = results.filter((r) => r.code !== 0);
  console.log(`\n=== 完了 OK ${ok.length} / NG ${ng.length} / 合計 ${results.length} ===`);
  if (ng.length) {
    console.log("NG:", ng.map((r) => r.slug).join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
