/**
 * 検索エンジンへの更新通知（IndexNow + Google Indexing API）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pingGoogleIndexing } from "./google-indexing.mjs";
import { SITE } from "./site-config.mjs";
import { loadAllArticles } from "./articles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

/** @type {string} IndexNow 検証キー（public/{key}.txt と一致） */
export const INDEXNOW_KEY = "a7f3c2e19b4d4f6a8e2d1c0b5a9e3f72";

const HOST = new URL(SITE.domain).host;

const INDEXNOW_ENDPOINTS = [
  { name: "IndexNow.org", url: "https://api.indexnow.org/indexnow" },
  { name: "Bing", url: "https://www.bing.com/indexnow" },
  { name: "Yandex", url: "https://yandex.com/indexnow" },
  { name: "Seznam", url: "https://search.seznam.cz/indexnow" },
];

const SITEMAP_PING_TARGETS = [
  /* Bing は IndexNow で通知。旧 ping?sitemap= は 410 廃止 */
];

/** @param {string} slug */
export function caseUrl(slug) {
  return `${SITE.domain.replace(/\/$/, "")}/case/${slug}/`;
}

/** @returns {Promise<string[]>} */
export async function staticPageUrls() {
  return [
    `${SITE.domain}/`,
    `${SITE.domain}/about/`,
    `${SITE.domain}/search/`,
    `${SITE.domain}/privacy-policy/`,
  ];
}

/**
 * @param {{ slug?: string; recentDays?: number; allLive?: boolean; extra?: string[] }} opts
 * @returns {Promise<string[]>}
 */
export async function collectNotifyUrls(opts = {}) {
  const urls = new Set(opts.extra ?? []);

  if (opts.slug) {
    urls.add(caseUrl(opts.slug));
    return [...urls];
  }

  const articles = await loadAllArticles();

  if (opts.recentDays != null && opts.recentDays > 0) {
    const since = Date.now() - opts.recentDays * 864e5;
    for (const a of articles) {
      const stamps = [a.publishedAt, a.nowSummary?.updatedAt, a.fetchedAt].filter(Boolean);
      if (stamps.some((iso) => new Date(iso).getTime() >= since)) {
        urls.add(caseUrl(a.slug));
      }
    }
  }

  if (opts.allLive || urls.size === 0) {
    for (const a of articles) urls.add(caseUrl(a.slug));
    for (const u of await staticPageUrls()) urls.add(u);
  }

  return [...urls].slice(0, 10_000);
}

/** @param {string[]} urlList @param {{ dryRun?: boolean }} opts */
export async function pingIndexNow(urlList, opts = {}) {
  if (urlList.length === 0) return [];

  const keyLocation = `${SITE.domain.replace(/\/$/, "")}/${INDEXNOW_KEY}.txt`;
  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation,
    urlList,
  });

  const results = [];
  for (const ep of INDEXNOW_ENDPOINTS) {
    if (opts.dryRun) {
      results.push({ service: ep.name, ok: true, status: "dry-run", count: urlList.length });
      continue;
    }
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
      });
      results.push({
        service: ep.name,
        ok: res.ok || res.status === 202,
        status: res.status,
        count: urlList.length,
      });
    } catch (err) {
      results.push({
        service: ep.name,
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

/** @param {{ dryRun?: boolean }} opts */
export async function pingSitemaps(opts = {}) {
  const sitemap = `${SITE.domain.replace(/\/$/, "")}/sitemap-index.xml`;
  const results = [];
  for (const t of SITEMAP_PING_TARGETS) {
    const url = t.buildUrl(sitemap);
    if (opts.dryRun) {
      results.push({ service: t.name, ok: true, status: "dry-run", url: sitemap });
      continue;
    }
    try {
      const res = await fetch(url, { method: "GET" });
      results.push({ service: t.name, ok: res.ok, status: res.status, url: sitemap });
    } catch (err) {
      results.push({
        service: t.name,
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

/**
 * @param {{ slug?: string; recentDays?: number; allLive?: boolean; dryRun?: boolean; force?: boolean; extra?: string[] }} opts
 */
export async function notifySearchEngines(opts = {}) {
  const urlList = await collectNotifyUrls(opts);
  const indexNow = await pingIndexNow(urlList, opts);
  const sitemaps = await pingSitemaps(opts);
  const google = await pingGoogleIndexing(urlList, opts);
  return { urlList, indexNow, sitemaps, google };
}

/** IndexNow キーファイル本文（デプロイ前に public/ に置く） */
export function indexNowKeyFileBody() {
  return `${INDEXNOW_KEY}\n`;
}

export async function ensureIndexNowKeyFile() {
  const file = path.join(root, "public", `${INDEXNOW_KEY}.txt`);
  await readFile(file, "utf8").catch(async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, indexNowKeyFileBody(), "utf8");
  });
}
