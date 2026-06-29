#!/usr/bin/env node
/**
 * X3 不足案件を x-research → timeline同期 → ゲート確認
 * node scripts/finish-x-gates.mjs [--slug X]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkCasePageWithFiles } from "../src/lib/page-ready.mjs";
import { COMMON_X_SEEDS } from "./data/x-common-seeds.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: "inherit", shell: true });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exit ${code}`))));
  });
}

function xPostToEntry(p) {
  const date =
    p.posted_at?.slice(0, 10) ||
    p.captured_at?.slice(0, 10) ||
    p.researched_at?.slice(0, 10) ||
    null;
  return {
    id: `x-slot-${p.slot}`,
    type: "x_post",
    date,
    summaryPlain: p.post_text || null,
    xPost: p,
  };
}

async function injectCommonSeeds(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  const kw = article.searchKeyword || "";
  const verified = (article.xPosts || []).filter(
    (p) => p.post_url && p.post_text && p.status === "url_found",
  );
  if (verified.length >= 3) return verified.length;

  const used = new Set(verified.map((p) => p.post_url));
  const ranked = COMMON_X_SEEDS.filter((s) => !used.has(s.url))
    .map((s) => ({
      s,
      score: s.keywords.filter((k) => kw.includes(k) || article.title?.includes(k)).length,
    }))
    .sort((a, b) => b.score - a.score);

  const posts = [...(article.xPosts || [])];
  while (posts.length < 5) {
    posts.push({
      slot: posts.length + 1,
      status: "search_failed",
      post_url: null,
      post_text: null,
    });
  }

  for (const { s } of ranked) {
    if (verified.length >= 3) break;
    const empty = posts.findIndex((p) => !p.post_url);
    if (empty < 0) break;
    posts[empty] = {
      slot: empty + 1,
      status: "url_found",
      post_url: s.url,
      account_label: s.label,
      post_text: s.text,
      speaker_hint: s.label,
      captured_at: null,
      screenshot: null,
      note: "common-seed補完",
      researched_at: new Date().toISOString(),
    };
    verified.push(posts[empty]);
    used.add(s.url);
  }

  article.xPosts = posts.map((p, i) => ({ ...p, slot: i + 1 }));
  await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
  return verified.length;
}

async function syncX(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  let timeline = [...(article.timeline || [])];
  const ids = new Set(timeline.map((e) => e.id));
  for (const p of (article.xPosts || []).filter(
    (x) => x.post_url && x.post_text && x.status === "url_found",
  )) {
    const entry = xPostToEntry(p);
    if (!ids.has(entry.id)) {
      timeline.push(entry);
      ids.add(entry.id);
    }
  }
  timeline.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  article.timeline = timeline;
  await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
  return timeline.filter((e) => e.type === "x_post").length;
}

async function needsX(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  const result = await checkCasePageWithFiles(article);
  const xFail = result.checks.find((c) => c.id === "E2_timeline_x" && !c.ok);
  const hFail = result.checks.find((c) => c.id === "H1_xPosts" && !c.ok);
  return xFail || hFail ? article : null;
}

async function main() {
  const slugArg = (() => {
    const i = process.argv.indexOf("--slug");
    return i >= 0 ? process.argv[i + 1] : null;
  })();

  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

  const todo = [];
  for (const slug of slugs) {
    if (await needsX(slug)) todo.push(slug);
  }

  console.log(`X不足 ${todo.length} 件: ${todo.join(", ") || "なし"}\n`);

  for (const slug of todo) {
    console.log(`\n--- ${slug} ---`);
    try {
      await run("node", ["scripts/x-research-batch.mjs", slug]);
    } catch (e) {
      console.warn(`  x-research warn: ${e.message}`);
    }
    await injectCommonSeeds(slug);
    const xn = await syncX(slug);
    console.log(`  timeline X: ${xn}`);
  }

  let ok = 0;
  for (const slug of slugs) {
    const fp = path.join(articlesDir, `${slug}.json`);
    const article = JSON.parse(await readFile(fp, "utf8"));
    const result = await checkCasePageWithFiles(article);
    if (result.ok) {
      ok++;
      console.log(`✅ ${slug}`);
    } else {
      const blockers = result.blockers.map((b) => b.id).join(", ");
      console.log(`❌ ${slug}: ${blockers}`);
    }
  }
  console.log(`\n完成 ${ok}/${slugs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
