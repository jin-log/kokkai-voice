#!/usr/bin/env node
/**
 * 新規公開記事 → はてな + note（公開キュー or --slug / --recent）
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles, loadArticle } from "../src/lib/articles.mjs";
import { buildHatena } from "../src/lib/promo-generate.mjs";
import { loadPromoIntroLog, recordPromoIntro } from "../src/lib/promo-intro-status.mjs";
import {
  dequeuePromoPublish,
  loadPromoPublishQueue,
} from "../src/lib/promo-publish-queue.mjs";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slugArg = arg("--slug");
const recentDays = arg("--recent");
const fromQueue = args.includes("--from-queue");

async function postHatena(page, article) {
  const hatena = buildHatena(article);
  await page.goto(hatena.addUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  if (page.url().includes("/login")) throw new Error("はてな未ログイン");

  const comment = page.locator('textarea[name="comment"], textarea#comment, textarea').first();
  if (await comment.count()) await comment.fill(hatena.comment);
  const title = page.locator('input[name="title"], input#title').first();
  if (await title.count()) await title.fill(hatena.title);
  const btn = page.getByRole("button", { name: /ブックマーク|登録|追加/ }).first();
  if (!(await btn.count())) throw new Error("はてブ登録ボタンなし");
  await btn.click();
  await page.waitForTimeout(2000);
}

async function resolveSlugs() {
  if (fromQueue) {
    const q = await loadPromoPublishQueue();
    return q.pending.map((p) => p.slug);
  }
  if (slugArg) return [slugArg];

  if (recentDays) {
    const days = Number(recentDays);
    const since = Date.now() - days * 86400000;
    const articles = await loadAllArticles();
    const intro = await loadPromoIntroLog();
    return articles
      .filter((a) => {
        const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        return t >= since;
      })
      .filter((a) => force || !intro.hatena?.[a.slug] || !intro.note?.[a.slug])
      .map((a) => a.slug);
  }

  return [];
}

/** @param {string} slug */
async function isPromoComplete(slug) {
  const intro = await loadPromoIntroLog();
  return Boolean(intro.hatena?.[slug] && intro.note?.[slug]);
}

async function main() {
  const slugs = await resolveSlugs();
  if (!slugs.length) {
    console.log("SKIP — はてな/note 投稿対象なし");
    process.exit(0);
  }

  console.log("対象:", slugs.join(", "));
  if (dryRun) {
    for (const s of slugs) {
      const a = await loadArticle(s);
      console.log("\n---", s, "---");
      console.log(buildHatena(a).comment.slice(0, 200));
    }
    process.exit(0);
  }

  const launchedHatena = await launchPromoBrowser("hatena", { headless: false });
  const hatenaPage = launchedHatena.context.pages()[0] || (await launchedHatena.context.newPage());

  try {
    for (const s of slugs) {
      const intro = await loadPromoIntroLog();
      if (!force && intro.hatena?.[s]) {
        console.log(`SKIP はてな済 ${s}`);
        continue;
      }
      const article = await loadArticle(s);
      console.log(`\n[hatena] ${s}`);
      await postHatena(hatenaPage, article);
      await recordPromoIntro(s, "hatena");
      console.log(`OK はてな ${s}`);
    }
  } finally {
    await closePromoBrowser(launchedHatena);
  }

  for (const s of slugs) {
    const intro = await loadPromoIntroLog();
    if (!force && intro.note?.[s]) {
      console.log(`SKIP note済 ${s}`);
      continue;
    }
    console.log(`\n[note] ${s}`);
    const r = spawnSync(
      process.execPath,
      [path.join(__dirname, "post-note-article.mjs"), "--slug", s],
      { cwd: root, stdio: "inherit" },
    );
    if (r.status !== 0) {
      console.error(`NG note ${s}`);
      process.exit(r.status ?? 1);
    }
  }

  if (fromQueue) {
    const done = [];
    for (const s of slugs) {
      if (await isPromoComplete(s)) done.push(s);
    }
    if (done.length) await dequeuePromoPublish(done);
    console.log("\nキュー消化:", done.join(", ") || "（未完あり）");
  }

  console.log("\n完了");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
