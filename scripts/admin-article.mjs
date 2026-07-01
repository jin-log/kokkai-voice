#!/usr/bin/env node
/**
 * 管理画面からの記事操作（GitHub Actions 経由）
 *
 * Usage:
 *   node scripts/admin-article.mjs --action update_title --slug X --title "新タイトル — あの話どうなった？"
 *   node scripts/admin-article.mjs --action hide --slug X
 *   node scripts/admin-article.mjs --action unhide --slug X
 *   node scripts/admin-article.mjs --action delete --slug X
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkCasePageWithFiles } from "../src/lib/page-ready.mjs";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";
import { isTitleAnsweredInOpeningLine, assessTitleOpeningAnswer } from "../src/lib/publish-policy.mjs";
import { enqueuePromoPublish } from "../src/lib/promo-publish-queue.mjs";
import { recordArticleActivity } from "../src/lib/article-activity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const action = arg("--action");
const slug = arg("--slug")?.trim();
const title = arg("--title")?.trim();

const ALLOWED = new Set(["update_title", "hide", "unhide", "delete", "publish"]);

if (!action || !ALLOWED.has(action)) {
  console.error("必須: --action update_title|hide|unhide|delete|publish --slug SLUG");
  process.exit(1);
}
if (!slug) {
  console.error("--slug は必須です");
  process.exit(1);
}

const articlePath = path.join(articlesDir, `${slug}.json`);

async function loadIndex() {
  const p = path.join(articlesDir, "index.json");
  return { path: p, data: JSON.parse(await readFile(p, "utf8")) };
}

async function saveIndex(indexPath, data) {
  data.count = data.slugs?.length ?? 0;
  data.updatedAt = new Date().toISOString();
  await writeFile(indexPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadArticle() {
  try {
    return JSON.parse(await readFile(articlePath, "utf8"));
  } catch {
    console.error(`記事が見つかりません: ${slug}`);
    process.exit(1);
  }
}

async function saveArticle(article) {
  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
}

if (action === "update_title") {
  if (!title) {
    console.error("--title は必須です");
    process.exit(1);
  }
  const article = await loadArticle();
  article.title = title;
  article.nowSummary = article.nowSummary ?? {};
  article.nowSummary.updatedAt = new Date().toISOString();
  await saveArticle(article);
  console.log(`OK: title updated → ${title}`);
  process.exit(0);
}

if (action === "hide") {
  const article = await loadArticle();
  const at = new Date().toISOString();
  article.adminHidden = true;
  article.adminHiddenAt = at;
  article.adminHiddenBy = "owner";
  await saveArticle(article);
  await recordArticleActivity({
    slug,
    type: "hide.manual",
    actor: "owner",
    detail: "管理画面から非表示",
  });
  await refreshProjectStatus();
  console.log(`OK: ${slug} を非表示にしました`);
  process.exit(0);
}

if (action === "unhide") {
  const article = await loadArticle();
  article.adminHidden = false;
  delete article.adminHiddenAt;
  delete article.adminHiddenBy;
  await saveArticle(article);
  await recordArticleActivity({
    slug,
    type: "unhide.manual",
    actor: "owner",
    detail: "管理画面から表示復帰",
  });
  await refreshProjectStatus();
  console.log(`OK: ${slug} を表示に戻しました`);
  process.exit(0);
}

if (action === "publish") {
  const article = await loadArticle();
  const titleAnswer = assessTitleOpeningAnswer(article);
  if (!titleAnswer.ok) {
    console.error(`公開できません（1行目がタイトルに未回答）: ${slug}`);
    console.error(`  - ${titleAnswer.id}: ${titleAnswer.detail}`);
    if (titleAnswer.todo) console.error(`  → ${titleAnswer.todo}`);
    process.exit(1);
  }
  article.publishReady = true;
  article.pageReady = true;
  article.adminHidden = false;
  delete article.adminHiddenAt;
  const at = new Date().toISOString();
  article.publishedAt = at;
  article.publishedBy = "owner";
  await saveArticle(article);
  await recordArticleActivity({
    slug,
    type: "publish.manual",
    actor: "owner",
    detail: "管理画面から一般公開",
  });
  await enqueuePromoPublish(slug);
  await recordArticleActivity({
    slug,
    type: "promo.queue",
    actor: "system",
    detail: "はてブ/note発信キューに登録",
  });
  await refreshProjectStatus();
  console.log(`OK: ${slug} を公開しました（/case/${slug}/）`);
  process.exit(0);
}

if (action === "delete") {
  const { path: indexPath, data: index } = await loadIndex();
  if (!index.slugs?.includes(slug)) {
    console.error(`index.json に ${slug} がありません`);
    process.exit(1);
  }
  index.slugs = index.slugs.filter((s) => s !== slug);
  await saveIndex(indexPath, index);

  try {
    await unlink(articlePath);
  } catch {
    /* already gone */
  }

  const matrixPath = path.join(root, `data/policy-matrix/${slug}.json`);
  try {
    await unlink(matrixPath);
  } catch {
    /* optional */
  }

  console.log(`OK: ${slug} を削除しました`);
  process.exit(0);
}
