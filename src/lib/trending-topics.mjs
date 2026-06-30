/**
 * 政治・社会の関心ワード収集（Google Trends 等）
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "./articles.mjs";

/** Astro ビルド時は Vite バンドルで import.meta.url がずれるため cwd 優先 */
async function resolveProjectRoot() {
  const candidates = [process.cwd(), path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")];
  for (const root of candidates) {
    try {
      await access(path.join(root, "package.json"));
      return root;
    } catch {
      /* try next */
    }
  }
  return process.cwd();
}

const root = await resolveProjectRoot();
export const TRENDING_PATH = path.join(root, "data/trending-topics.json");
const TOPICS_PATH = path.join(root, "data/topics.json");

const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo=JP";
const NHK_MAIN_RSS = "https://www3.nhk.or.jp/rss/news/cat0.xml";

/** @type {string[]} */
const POLITICAL_HINTS = [
  "国会", "首相", "総理", "大臣", "政権", "内閣", "法案", "予算", "税制", "消費税",
  "年金", "防衛", "憲法", "外交", "選挙", "知事", "都知事", "リコール", "政治",
  "議員", "党", "自民", "立憲", "維新", "公明", "共産", "参政", "国民民主",
  "物価", "賃金", "少子化", "移民", "外国人", "補正", "解散", "閣議", "会見",
  "判決", "告発", "献金", "裏金", "万博", "IR", "カジノ", "関税", "トランプ",
];

/** @type {string[]} */
const EXCLUDE_HINTS = [
  "野球", "サッカー", "W杯", "プロ野", "対 ", "俳優", "女優", "ドラマ", "アイドル",
  "ミスド", "もっちゅ", "調教師", "JRA", "巨人", "阪神", "ソフトバンク", "DeNA",
  "ユ・アイン", "K-POP", "韓国俳優",
];

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isPoliticalTopic(text) {
  const t = text || "";
  if (EXCLUDE_HINTS.some((w) => t.includes(w))) return false;
  return POLITICAL_HINTS.some((w) => t.includes(w));
}

/**
 * @param {string} xml
 * @returns {{ keyword: string, traffic?: string, headline?: string, url?: string, source: string }[]}
 */
export function parseGoogleTrendsRss(xml) {
  /** @type {{ keyword: string, traffic?: string, headline?: string, url?: string, source: string }[]} */
  const out = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const keyword = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    if (!keyword || keyword === "Daily Search Trends") continue;
    const traffic = block.match(/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/)?.[1]?.trim();
    const headline = block.match(/<ht:news_item_title>([^<]*)<\/ht:news_item_title>/)?.[1]?.trim();
    const url = block.match(/<ht:news_item_url>([^<]*)<\/ht:news_item_url>/)?.[1]?.trim();
    out.push({ keyword, traffic, headline, url, source: "google-trends" });
  }
  return out;
}

/**
 * @param {string} xml
 * @returns {{ keyword: string, headline?: string, url?: string, source: string }[]}
 */
export function parseNhkRss(xml) {
  /** @type {{ keyword: string, headline?: string, url?: string, source: string }[]} */
  const out = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const headline = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim();
    const url = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1]?.trim();
    if (!headline) continue;
    const keyword = headline.replace(/【[^】]+】/g, "").slice(0, 40).trim();
    out.push({ keyword, headline, url, source: "nhk" });
  }
  return out;
}

/** @param {number} trafficStr */
function trafficScore(trafficStr) {
  if (!trafficStr) return 0;
  const n = Number(String(trafficStr).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {{ keyword: string, traffic?: string, headline?: string, url?: string, source: string }[]} raw
 */
function dedupeTrends(raw) {
  const seen = new Set();
  /** @type {typeof raw} */
  const out = [];
  for (const item of raw) {
    const key = item.keyword.replace(/\s+/g, "").slice(0, 24);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * @param {import('./articles.mjs').Article[]} articles
 * @param {string} keyword
 */
function findArticleMatch(articles, keyword) {
  const terms = (keyword || "")
    .split(/[\s　、。]+/)
    .map((w) => w.replace(/[【】]/g, ""))
    .filter((w) => w.length >= 3);
  if (!terms.length) return null;
  return (
    articles.find((a) => {
      const hay = `${a.slug} ${a.title} ${a.searchKeyword ?? ""}`;
      return terms.some((t) => hay.includes(t));
    }) ?? null
  );
}

/**
 * @param {{ keyword: string, traffic?: string, headline?: string, url?: string, source: string }[]} items
 * @param {import('./articles.mjs').Article[]} articles
 */
export function enrichTrendItems(items, articles) {
  return items.map((item) => {
    const political = isPoliticalTopic(`${item.keyword} ${item.headline ?? ""}`);
    const match = findArticleMatch(articles, item.keyword);
    return {
      ...item,
      political,
      articleSlug: match?.slug ?? null,
      articleTitle: match?.title ?? null,
      score: trafficScore(item.traffic) + (political ? 500 : 0),
    };
  });
}

/** @returns {Promise<{ keyword: string, title: string, tags?: string[] }[]>} */
async function loadSeedTopics() {
  try {
    const raw = JSON.parse(await readFile(TOPICS_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * @param {{ tavilyApiKey?: string }} [opts]
 */
export async function fetchTrendingTopics(opts = {}) {
  const articles = await loadAllArticles();
  const seeds = await loadSeedTopics();

  /** @type {{ keyword: string, traffic?: string, headline?: string, url?: string, source: string }[]} */
  let raw = [];

  try {
    const res = await fetch(GOOGLE_TRENDS_RSS, {
      headers: { "User-Agent": "kokkai-voice-trends/1.0" },
    });
    if (res.ok) raw.push(...parseGoogleTrendsRss(await res.text()));
  } catch (e) {
    console.warn("[trends] Google Trends:", e instanceof Error ? e.message : e);
  }

  try {
    const res = await fetch(NHK_MAIN_RSS, {
      headers: { "User-Agent": "kokkai-voice-trends/1.0" },
    });
    if (res.ok) raw.push(...parseNhkRss(await res.text()).slice(0, 20));
  } catch (e) {
    console.warn("[trends] NHK RSS:", e instanceof Error ? e.message : e);
  }

  if (opts.tavilyApiKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: opts.tavilyApiKey,
          query: "日本 政治 注目 ニュース 今日",
          search_depth: "basic",
          max_results: 8,
          include_domains: ["nhk.or.jp", "yahoo.co.jp", "asahi.com", "mainichi.jp"],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const r of data.results ?? []) {
          raw.push({
            keyword: String(r.title ?? "").slice(0, 48),
            headline: r.title,
            url: r.url,
            source: "tavily",
          });
        }
      }
    } catch (e) {
      console.warn("[trends] Tavily:", e instanceof Error ? e.message : e);
    }
  }

  raw = dedupeTrends(raw);
  const enriched = enrichTrendItems(raw, articles);

  const political = enriched
    .filter((t) => t.political)
    .sort((a, b) => b.score - a.score);

  const rising = enriched
    .filter((t) => t.source === "google-trends" && trafficScore(t.traffic) >= 500)
    .sort((a, b) => trafficScore(b.traffic) - trafficScore(a.traffic));

  const evergreen = seeds.map((s) => {
    const article = articles.find((a) => a.slug === s.slug);
    const live = Boolean(article?.publishReady && !article?.adminHidden);
    return {
      keyword: s.keyword || s.title,
      headline: s.title,
      source: "seed",
      political: true,
      articleSlug: article?.slug ?? s.slug,
      articleTitle: article?.title ?? s.title,
      published: live,
      score: live ? 50 : 150,
      url: article?.slug ? `/case/${article.slug}/` : null,
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    political,
    rising: rising.slice(0, 15),
    all: enriched.slice(0, 40),
    evergreen,
  };
}

/** @returns {Promise<Awaited<ReturnType<typeof fetchTrendingTopics>> | null>} */
export async function loadTrendingTopics() {
  try {
    return JSON.parse(await readFile(TRENDING_PATH, "utf8"));
  } catch {
    return null;
  }
}

/** @param {Awaited<ReturnType<typeof fetchTrendingTopics>>} data */
export async function saveTrendingTopics(data) {
  await mkdir(path.dirname(TRENDING_PATH), { recursive: true });
  await writeFile(TRENDING_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
