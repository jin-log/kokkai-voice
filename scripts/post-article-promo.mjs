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
import { promoHeadless } from "../src/lib/ci-env.mjs";

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
const limitArg = arg("--limit");

async function postHatena(page, article) {
  const hatena = buildHatena(article);
  await page.goto(hatena.addUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  if (page.url().includes("/login")) throw new Error("はてな未ログイン");

  // コメント欄・タイトル欄はJSで直接セット（モーダル非表示対応）
  await page.evaluate(({ comment, title }) => {
    const ta = document.querySelector('textarea[name="comment"], textarea#comment, textarea[name="annotation"], textarea');
    if (ta) {
      ta.value = comment;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const ti = document.querySelector('input[name="title"], input#title');
    if (ti) {
      ti.value = title;
      ti.dispatchEvent(new Event("input", { bubbles: true }));
      ti.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, { comment: hatena.comment, title: hatena.title });
  await page.waitForTimeout(800);
  // ボタンを複数の方法で探す
  let clicked = false;
  const btnSelectors = [
    '[role="button"]:has-text("ブックマーク")',
    'button:has-text("ブックマーク")',
    'button:has-text("登録")',
    'button:has-text("追加")',
    'button[type="submit"]',
    'input[type="submit"]',
    '.bookmark-btn',
    '.bookmarkadd-button',
  ];
  for (const sel of btnSelectors) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      await el.click({ force: true, timeout: 5000 }).catch(() => {});
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    // JSでsubmitを試みる
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"], .bookmarkadd-button, [class*="bookmark"][class*="button"]');
      if (btn) btn.click();
    });
  }
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
  let slugs = await resolveSlugs();
  const limit = limitArg ? Math.max(1, Number(limitArg)) : slugs.length;
  slugs = slugs.slice(0, limit);
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

  const launchedHatena = await launchPromoBrowser("hatena", { headless: promoHeadless() });
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
