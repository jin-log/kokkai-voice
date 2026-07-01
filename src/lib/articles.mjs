import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTitleAnsweredInOpeningLine } from "./publish-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "../..");

/** 一般公開済みか */
export function isPagePublic(article) {
  return article.pageReady === true;
}

/** プレビュー可能 — 1行目がタイトルに回答済み、または publishReady */
export async function isPreviewable(article) {
  if (article.publishReady === true) return true;
  return isPublishGateOk(article);
}

/** 一般公開ボタン表示基準（1行目がタイトルに回答） */
export async function isPublishGateOk(article) {
  return isTitleAnsweredInOpeningLine(article);
}

/** @deprecated 同期判定は使わない。filterPublishable を使う */
export function isPublishable(article) {
  return article.publishReady === true && article.pageReady === true;
}

/** 本番ビルドに載せる記事 — 管理画面の「公開する」(pageReady) を正とする。ゲート未達でも落とさない */
export async function filterPublishable(articles) {
  return articles.filter((a) => !a.adminHidden && a.pageReady === true);
}

/** プレビューページ用スラグ（管理画面から全activeをプレビュー可） */
export async function getPreviewSlugs() {
  const index = JSON.parse(
    await readFile(path.join(root, "data/articles/index.json"), "utf8"),
  );
  return index.slugs ?? [];
}

export async function getArticleSlugs() {
  const index = JSON.parse(
    await readFile(path.join(root, "data/articles/index.json"), "utf8"),
  );
  const articles = await Promise.all(index.slugs.map((slug) => loadArticle(slug)));
  return (await filterPublishable(articles)).map((a) => a.slug);
}

export async function loadArticle(slug) {
  const raw = await readFile(
    path.join(root, `data/articles/${slug}.json`),
    "utf8",
  );
  return JSON.parse(raw);
}

export async function loadAllArticles() {
  const index = JSON.parse(
    await readFile(path.join(root, "data/articles/index.json"), "utf8"),
  );
  const articles = await Promise.all(index.slugs.map((slug) => loadArticle(slug)));
  return filterPublishable(articles);
}

export async function loadStanceData(article) {
  const sm = article.stanceMatrix;
  if (!sm) return null;
  const matrixPath = sm.dataPath
    ? path.join(root, sm.dataPath)
    : path.join(root, `data/policy-matrix/${sm.policySlug || article.slug}.json`);
  try {
    const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
    const politicians = [];
    for (const slug of sm.highlightPoliticians || []) {
      try {
        politicians.push(
          JSON.parse(
            await readFile(path.join(root, `data/politicians/${slug}.json`), "utf8"),
          ),
        );
      } catch {
        /* optional */
      }
    }
    return { matrix, politicians, meta: sm };
  } catch {
    return null;
  }
}

/** Build search index from article JSON (MVP — no D1). */
export function articleToSearchEntry(article) {
  const good = article.reactions?.good ?? 0;
  const neutral = article.reactions?.neutral ?? 0;
  const bad = article.reactions?.bad ?? 0;
  const heat = good + bad + neutral * 0.5;
  const updated =
    article.nowSummary?.updatedAt?.slice(0, 10) ||
    article.fetchedAt?.slice(0, 10) ||
    "";
  const started = article.primarySpeech?.date || updated;
  const summary =
    article.nowSummary?.bullets?.[0] ||
    article.summaryBullets?.[0] ||
    article.primarySpeech?.excerpt?.slice(0, 80) ||
    "";
  return {
    slug: article.slug,
    href: `/case/${article.slug}`,
    title: article.title,
    summary,
    tags: article.tags || [],
    categories: [...new Set([...(article.tags || []), article.category].filter(Boolean))],
    updated,
    started,
    heat: Math.round(heat * 10) || 100,
    trend: Math.round(heat * 3) || 50,
    smile: good || 1,
    angry: bad || 1,
  };
}
