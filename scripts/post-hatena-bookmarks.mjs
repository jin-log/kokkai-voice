#!/usr/bin/env node
/**
 * はてなブックマーク登録（保存済みセッション使用）
 *
 *   node scripts/post-hatena-bookmarks.mjs
 *   node scripts/post-hatena-bookmarks.mjs --slug fukushuto-koso
 *   node scripts/post-hatena-bookmarks.mjs --dry-run
 */
import { loadAllArticles } from "../src/lib/articles.mjs";
import { pickTopForDigest } from "../src/lib/article-promo-score.mjs";
import { buildHatena } from "../src/lib/promo-generate.mjs";
import { launchLoggedIn } from "../src/lib/browser-session.mjs";

const dryRun = process.argv.includes("--dry-run");
const slugArg = process.argv.find((a, i) => process.argv[i - 1] === "--slug");

async function postOne(page, hatena) {
  await page.goto(hatena.addUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);

  if (page.url().includes("/login")) {
    throw new Error("はてな未ログイン — npm run browser:login -- hatena");
  }

  const comment = page.locator('textarea[name="comment"], textarea#comment, textarea').first();
  if (await comment.count()) {
    await comment.fill(hatena.comment);
  }

  const title = page.locator('input[name="title"], input#title').first();
  if (await title.count()) {
    await title.fill(hatena.title);
  }

  const btn = page.getByRole("button", { name: /ブックマーク|登録|追加/ }).first();
  if (!(await btn.count())) {
    throw new Error("登録ボタンが見つかりません");
  }
  if (!dryRun) await btn.click();
  await page.waitForTimeout(2000);
}

async function main() {
  const articles = await loadAllArticles();
  const picks = slugArg
    ? articles.filter((a) => a.slug === slugArg)
    : pickTopForDigest(articles, new Set(), 3);

  if (!picks.length) {
    console.error("NG 対象記事なし");
    process.exit(1);
  }

  console.log("対象:", picks.map((a) => a.slug).join(", "));
  if (dryRun) {
    for (const a of picks) console.log(buildHatena(a).addUrl);
    return;
  }

  const context = await launchLoggedIn("hatena", { headless: false });
  const page = context.pages()[0] || (await context.newPage());

  for (const article of picks) {
    const hatena = buildHatena(article);
    console.log(`\n→ ${article.slug}`);
    await postOne(page, hatena);
    console.log(`OK ${article.slug}`);
  }

  await context.close();
  console.log("\nOK はてブ登録完了");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
