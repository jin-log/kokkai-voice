#!/usr/bin/env node
/**
 * 記事1本を note に公開（抜粋 + 本家リンク + メンバー導線 + 見出し画像）
 *
 *   node scripts/post-note-article.mjs --slug case-xxx
 *   node scripts/post-note-article.mjs --slug case-xxx --edit n7bed88403e89
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { buildNoteExcerpt } from "../src/lib/promo-generate.mjs";
import { recordPromoIntro } from "../src/lib/promo-intro-status.mjs";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";
import { fillNoteEditorWithEmbeds } from "./lib/note-editor.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes("--dry-run");
const slug = arg("--slug");
const editNoteId = arg("--edit");

if (!slug) {
  console.error("Usage: node scripts/post-note-article.mjs --slug <slug> [--edit NOTE_ID]");
  process.exit(1);
}

/** @param {import('playwright').Page} page */
async function clickNotePublish(page) {
  const patterns = [/公開に進む/, /^公開する$/, /投稿する/, /更新する/, /公開する/];
  for (const pattern of patterns) {
    const btn = page.getByRole("button", { name: pattern });
    const n = await btn.count();
    for (let i = 0; i < n; i++) {
      const el = btn.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      await el.click({ timeout: 8000 });
      await page.waitForTimeout(2000);
    }
  }

  const linkPub = page.locator("a, button").filter({ hasText: /^公開に進む$/ });
  if (await linkPub.count()) {
    await linkPub.first().click({ timeout: 8000 });
    await page.waitForTimeout(2000);
  }
}

/** @param {import('playwright').Page} page */
async function waitNotePublished(page, timeoutMs = 25_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (/\/n\/n[a-z0-9]+/i.test(url)) {
      if (url.includes("/info/")) {
        const m = url.match(/\/n\/(n[a-z0-9]+)/i);
        if (m) return `https://note.com/seiji1192/n/${m[1]}`;
      }
      return url;
    }

    if (await page.getByText(/記事が公開されました|記事を更新しました/).count()) {
      const hrefs = await page.$$eval('a[href*="/n/n"]', (els) =>
        els.map((e) => e.href).filter(Boolean),
      );
      if (hrefs[0]) return hrefs[0];
      return url;
    }

    await page.waitForTimeout(500);
  }
  return null;
}

/** @param {import('playwright').Page} page @param {ReturnType<typeof buildNoteExcerpt>} note @param {string} slug */
async function postNoteArticle(page, note, slug) {
  await fillNoteEditorWithEmbeds(page, note, { editNoteId: editNoteId || undefined });
  await clickNotePublish(page);

  const url = await waitNotePublished(page);
  if (url) return url;

  await mkdir(path.join(root, "output/debug"), { recursive: true });
  const shot = path.join(root, "output/debug", `note-publish-fail-${slug}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  throw new Error(`note 公開未完了 — スクショ: ${shot}`);
}

async function main() {
  const article = await loadArticle(slug);
  const note = buildNoteExcerpt(article);

  console.log(`[note] ${slug}${editNoteId ? ` (更新 ${editNoteId})` : ""}`);
  console.log(`タイトル: ${note.title}`);
  console.log(`見出し: ${note.eyecatchPath}`);
  if (dryRun) {
    console.log("\n--- 本文 ---");
    for (const seg of note.bodySegments) {
      console.log(seg.type === "text" ? seg.value : `[OGPカード] ${seg.url}`);
    }
    return;
  }

  const launched = await launchPromoBrowser("note");
  const page = launched.context.pages()[0] || (await launched.context.newPage());

  try {
    const url = await postNoteArticle(page, note, slug);
    await recordPromoIntro(slug, "note");
    console.log(`OK note ${editNoteId ? "更新" : "公開"}: ${url}`);
  } finally {
    await closePromoBrowser(launched);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
