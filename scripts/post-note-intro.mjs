#!/usr/bin/env node
/**
 * note 初回紹介記事を下書き保存（保存済みセッション使用）
 *
 *   node scripts/post-note-intro.mjs
 *   node scripts/post-note-intro.mjs --publish
 *   node scripts/post-note-intro.mjs --dry-run
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchLoggedIn } from "../src/lib/browser-session.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTRO = path.join(root, "content/note/01-site-intro.md");

const dryRun = process.argv.includes("--dry-run");
const publish = process.argv.includes("--publish");

function parseIntro(md) {
  const titleMatch = md.match(/## タイトル\s+([\s\S]*?)\s+## 本文/);
  const bodyMatch = md.match(/## 本文\s+([\s\S]*)$/);
  const title = (titleMatch?.[1] || "").trim().split("\n")[0].trim();
  const body = (bodyMatch?.[1] || "").trim();
  return { title, body };
}

async function main() {
  const md = await readFile(INTRO, "utf8");
  const { title, body } = parseIntro(md);
  if (!title || !body) {
    console.error("NG content/note/01-site-intro.md の形式が不正");
    process.exit(1);
  }

  console.log(`タイトル: ${title}\n---\n${body.slice(0, 200)}...\n`);

  if (dryRun) return;

  const context = await launchLoggedIn("note", { headless: false });
  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await context.close();
    throw new Error("note 未ログイン — npm run browser:login -- note");
  }

  const titleBox = page.locator('[placeholder*="タイトル"], [data-testid="title"], textarea').first();
  await titleBox.click({ timeout: 15_000 });
  await titleBox.fill(title);

  const editor = page.locator('[contenteditable="true"]').last();
  await editor.click();
  await editor.fill(body);

  await page.waitForTimeout(1000);

  if (publish) {
    const pub = page.getByRole("button", { name: /公開する|投稿する/ }).first();
    await pub.click();
    await page.waitForTimeout(3000);
    console.log("OK note 公開しました:", page.url());
  } else {
    const draft = page.getByRole("button", { name: /下書き保存|保存/ }).first();
    if (await draft.count()) {
      await draft.click();
      await page.waitForTimeout(2000);
    }
    console.log("OK note 下書き保存:", page.url());
  }

  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
