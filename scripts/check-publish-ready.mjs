#!/usr/bin/env node
/**
 * デプロイ・アップロード前の法務ゲート
 * legalReview.status: pending | ok | needs_fix
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articleDir = path.join(root, "data/articles");

const VALID_STATUS = new Set(["pending", "ok", "needs_fix"]);

const STATUS_LABEL = {
  pending: "未レビュー (pending)",
  ok: "OK",
  needs_fix: "要修正 (needs_fix)",
};

function statusLabel(status) {
  return STATUS_LABEL[status] ?? `不明 (${status ?? "なし"})`;
}

function parseArgs(argv) {
  const slugIdx = argv.indexOf("--slug");
  const slug = slugIdx >= 0 ? argv[slugIdx + 1] : null;
  if (slugIdx >= 0 && !slug) {
    console.error("エラー: --slug の後に slug を指定してください");
    process.exit(1);
  }
  return { slug, all: argv.includes("--all") };
}

async function loadArticles() {
  const files = (await readdir(articleDir)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  const articles = [];
  for (const file of files) {
    const article = JSON.parse(await readFile(path.join(articleDir, file), "utf8"));
    articles.push(article);
  }
  return articles.sort((a, b) => a.slug.localeCompare(b.slug));
}

function legalStatus(article) {
  const status = article.legalReview?.status;
  if (!VALID_STATUS.has(status)) return status ?? null;
  return status;
}

function gateViolations(articles) {
  return articles.filter(
    (a) => a.publishReady === true && legalStatus(a) !== "ok",
  );
}

function checkSlug(articles, slug) {
  const article = articles.find((a) => a.slug === slug);
  if (!article) {
    console.error(`エラー: 記事 "${slug}" が見つかりません`);
    process.exit(1);
  }

  const errors = [];
  if (article.publishReady !== true) {
    errors.push("publishReady=false（公開準備未完了）");
  }
  if (legalStatus(article) !== "ok") {
    errors.push(`法務レビュー: ${statusLabel(legalStatus(article))}`);
  }

  if (errors.length > 0) {
    console.error(`エラー: ${slug} はデプロイ不可 — ${errors.join("、")}`);
    process.exit(1);
  }

  console.log(`OK: ${slug} はデプロイ可能です`);
}

function reportAll(articles) {
  const counts = { pending: 0, ok: 0, needs_fix: 0, other: 0 };
  for (const a of articles) {
    const s = legalStatus(a);
    if (s === "pending" || s === "ok" || s === "needs_fix") counts[s]++;
    else counts.other++;
  }

  const violations = gateViolations(articles);
  console.log(`法務レビュー集計（全${articles.length}件）:`);
  console.log(`  pending（未レビュー）: ${counts.pending}`);
  console.log(`  needs_fix（要修正）: ${counts.needs_fix}`);
  console.log(`  ok: ${counts.ok}`);
  if (counts.other > 0) {
    console.log(`  不明・欠落: ${counts.other}`);
  }
  console.log(`  publishReady=true かつ 法務未OK: ${violations.length}`);

  if (violations.length > 0) {
    console.error("");
    for (const a of violations) {
      console.error(
        `エラー: ${a.slug} は publishReady=true ですが、法務レビューが OK ではありません（現在: ${statusLabel(legalStatus(a))}）`,
      );
    }
    process.exit(1);
  }

  console.log("OK: 公開ゲート違反はありません");
}

function checkDefault(articles) {
  const violations = gateViolations(articles);
  if (violations.length > 0) {
    for (const a of violations) {
      console.error(
        `エラー: ${a.slug} は publishReady=true ですが、法務レビューが OK ではありません（現在: ${statusLabel(legalStatus(a))}）`,
      );
    }
    process.exit(1);
  }
  console.log("OK: 全記事の公開ゲートを通過しました");
}

const { slug, all } = parseArgs(process.argv.slice(2));
const articles = await loadArticles();

if (slug) {
  checkSlug(articles, slug);
} else if (all) {
  reportAll(articles);
} else {
  checkDefault(articles);
}
