#!/usr/bin/env node
/**
 * complete-article --force を全案件（または未完了分のみ）で実行。
 *
 *   node scripts/run-all-force.mjs              # 全件
 *   node scripts/run-all-force.mjs --resume     # batch-force-progress.json の未完了のみ
 *   node scripts/run-all-force.mjs --exclude=a,b
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { isLiveOnSite } from "../src/lib/publish-lock.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const progressPath = path.join(root, "data/batch-force-progress.json");

const resume = process.argv.includes("--resume");
const excludeArg = process.argv.find((a) => a.startsWith("--exclude="));

async function loadProgress() {
  try {
    return JSON.parse(await readFile(progressPath, "utf8"));
  } catch {
    return {
      batchId: "force",
      exclude: ["index", "parked", "kishida-resign"],
      autoRunOnWinPull: true,
      completed: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

async function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  await writeFile(progressPath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}

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

async function listAllSlugs(exclude) {
  const files = await readdir(path.join(root, "data/articles"));
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((s) => !exclude.has(s))
    .sort();
}

async function main() {
  const progress = await loadProgress();
  const exclude = new Set(
    excludeArg
      ? excludeArg.slice("--exclude=".length).split(",").map((s) => s.trim()).filter(Boolean)
      : progress.exclude ?? ["index", "parked", "kishida-resign"],
  );
  const completed = new Set(progress.completed ?? []);
  const all = await listAllSlugs(exclude);
  const slugs = resume ? all.filter((s) => !completed.has(s)) : all;

  if (!slugs.length) {
    console.log("batch-force: 未完了なし");
    return;
  }

  console.log(
    `=== complete-article --force × ${slugs.length} 件${resume ? "（resume）" : ""} ===\n`,
  );

  const results = [];
  for (const slug of slugs) {
    const article = await loadArticle(slug);
    if (isLiveOnSite(article)) {
      console.log(`\n>>> ${slug} — skip（公開中・SEO保護）`);
      if (!completed.has(slug)) {
        completed.add(slug);
        progress.completed = [...completed].sort();
        await saveProgress(progress);
      }
      continue;
    }
    console.log(`\n>>> ${slug}`);
    const result = await runSlug(slug);
    results.push(result);
    if (!completed.has(slug)) {
      completed.add(slug);
      progress.completed = [...completed].sort();
      await saveProgress(progress);
    }
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
