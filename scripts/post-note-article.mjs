#!/usr/bin/env node
/**
 * 記事1本を note に公開（抜粋 + 本家リンク）
 *
 *   node scripts/post-note-article.mjs --slug case-xxx
 *   node scripts/post-note-article.mjs --slug case-xxx --dry-run
 */
import { loadArticle } from "../src/lib/articles.mjs";
import { buildNoteExcerpt } from "../src/lib/promo-generate.mjs";
import { recordPromoIntro } from "../src/lib/promo-intro-status.mjs";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes("--dry-run");
const slug = arg("--slug");

if (!slug) {
  console.error("Usage: node scripts/post-note-article.mjs --slug <slug>");
  process.exit(1);
}

async function postNoteArticle(page, note) {
  await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    throw new Error("note 未ログイン");
  }

  const titleBox = page.locator('[placeholder*="タイトル"], [data-testid="title"], textarea').first();
  await titleBox.click({ timeout: 15_000 });
  await titleBox.fill(note.title);

  const editor = page.locator('[contenteditable="true"]').last();
  await editor.click();
  await editor.fill(note.bodyFree);

  await page.waitForTimeout(1000);

  const pub = page.getByRole("button", { name: /公開する|投稿する/ }).first();
  if (!(await pub.count())) {
    throw new Error("公開ボタンが見つかりません");
  }
  await pub.click();
  await page.waitForTimeout(4000);
  return page.url();
}

async function main() {
  const article = await loadArticle(slug);
  const note = buildNoteExcerpt(article);

  console.log(`[note] ${slug}`);
  console.log(`タイトル: ${note.title}`);
  if (dryRun) {
    console.log(note.bodyFree.slice(0, 400));
    return;
  }

  const launched = await launchPromoBrowser("note");
  const page = launched.context.pages()[0] || (await launched.context.newPage());

  try {
    const url = await postNoteArticle(page, note);
    await recordPromoIntro(slug, "note");
    console.log(`OK note 公開: ${url}`);
  } finally {
    await closePromoBrowser(launched);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
