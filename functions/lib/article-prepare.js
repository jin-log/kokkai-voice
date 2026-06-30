/**
 * 記事生成前の自動判定（カテゴリ・ソースURL・国会API）
 * dispatch（CF Pages）と scripts（Node）の両方から利用
 */

import { kokkaiKeywordCandidates } from "./kokkai-keyword.js";

const JINA_HEADERS = {
  Accept: "text/plain",
  "User-Agent": "kokkai-voice-prepare/1.0",
};

const NEWS_HOST =
  /(?:nikkei|asahi|mainichi|yomiuri|nhk|kyodo|jiji|bunshun|jbpress|sankei|tokyo-np|fnn|tv-asahi|yahoo\.co\.jp\/news)/i;

const BLOCK_HOST =
  /(?:wikipedia|amazon|youtube|facebook|instagram|tiktok|google\.|bing\.|x\.com|twitter\.com)/i;

/** @param {string} keyword */
export function makeSlug(keyword) {
  const ascii = keyword
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (ascii.length >= 3) return ascii.substring(0, 40);
  return `case-${Date.now().toString(36)}`;
}

/** @param {string} keyword — 暫定。ライターSkillで具体疑問タイトルに差し替え必須 */
export function defaultTitle(keyword) {
  return keyword.trim();
}

/** @param {string} keyword @param {string} [title] */
export function shouldPreferGeneral(keyword, title = "") {
  const k = `${keyword} ${title}`;
  return /都政|東京都|大阪|府県|知事|市長|リコール|構想|移民|出生率|太陽光|パネル|設置義務|副首都|地方|メトロポリ|在留/.test(
    k,
  );
}

/** @param {string} keyword @param {string} [title] */
export function buildSearchQueries(keyword, title = "") {
  const cleanTitle = title
    .replace(/[【】]/g, " ")
    .replace(/\s*[—–-]\s*あの話どうなった？\s*$/, "")
    .replace(/[?？]/g, "")
    .replace(/とは$|って何$/g, "")
    .trim();
  /** @type {Set<string>} */
  const queries = new Set();
  for (const q of [keyword.trim(), cleanTitle]) {
    if (!q) continue;
    queries.add(q);
    queries.add(`${q} ニュース`);
    queries.add(`${q} 日本`);
  }
  if (/東京都|大阪|都/.test(`${keyword} ${title}`)) {
    queries.add(`${cleanTitle || keyword} 都政`);
  }
  return [...queries].filter(Boolean).slice(0, 10);
}

/**
 * ライター側ルール：国会以外のカテゴリ自動判定
 * @param {string} keyword
 * @param {string} [title]
 */
export function classifyGeneralCategory(keyword, title = "") {
  const k = `${keyword} ${title}`.trim();
  if (/リコール/.test(k)) return { category: "リコール", tags: "リコール,地方" };
  if (/知事選|市長選|衆院|参院|選挙|立候補|当選|投開票/.test(k)) {
    return { category: "選挙", tags: "選挙" };
  }
  if (/知事|都議|県|市長|区長|都政|府知事|道知事|県知事|東京都|大阪/.test(k)) {
    return { category: "地方", tags: "地方" };
  }
  if (/出生率|移民|在留|予算|構想|行政|太陽光/.test(k)) {
    return { category: "行政", tags: "行政" };
  }
  return { category: "行政", tags: "行政" };
}

function filterUrls(urls) {
  return [...new Set(urls)].filter(
    (u) => u && /^https?:\/\//.test(u) && !BLOCK_HOST.test(u) && !isHomepageUrl(u),
  );
}

function isHomepageUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "") return true;
    if (path.split("/").length <= 1 && !/\.(html|php|pdf|aspx)$/i.test(path)) return true;
    return false;
  } catch {
    return true;
  }
}

function rankUrl(url) {
  if (NEWS_HOST.test(url)) return 0;
  if (/\.go\.jp/.test(url)) return 1;
  return 2;
}

/** @param {string} query @param {number} limit */
async function discoverGoogleNewsRss(query, limit = 6) {
  try {
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
    const res = await fetch(rss, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; kokkai-voice/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    /** @type {string[]} */
    const urls = [];
    for (const item of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      if (urls.length >= limit) break;
      const block = item[1];
      const source = block.match(/<source url="([^"]+)"/)?.[1];
      if (source && !BLOCK_HOST.test(source)) urls.push(source);
    }
    return filterUrls(urls).slice(0, limit);
  } catch {
    return [];
  }
}

/** @param {string} keyword @param {number} limit */
async function discoverJina(keyword, limit = 6) {
  const queries = [keyword, `${keyword} ニュース`, `${keyword} 報道`];
  /** @type {string[]} */
  const found = [];
  for (const q of queries) {
    if (found.length >= limit) break;
    try {
      const res = await fetch(`https://s.jina.ai/${encodeURIComponent(q)}`, {
        headers: { ...JINA_HEADERS, Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.data ?? []) {
        if (item.url) found.push(item.url);
      }
    } catch {
      /* next query */
    }
  }
  return filterUrls(found)
    .sort((a, b) => rankUrl(a) - rankUrl(b))
    .slice(0, limit);
}

/** @param {string} keyword @param {string|undefined} apiKey */
async function discoverTavily(keyword, apiKey) {
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${keyword} 日本 ニュース`,
        max_results: 8,
        search_depth: "basic",
        topic: "news",
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return filterUrls((data.results ?? []).map((r) => r.url)).slice(0, 6);
  } catch {
    return [];
  }
}

/** @param {string} keyword */
async function discoverDuckDuckGo(keyword) {
  try {
    const body = new URLSearchParams({ q: `${keyword} ニュース`, b: "" });
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; kokkai-voice/1.0)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const re = /uddg=([^&"]+)/g;
    /** @type {string[]} */
    const urls = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        urls.push(decodeURIComponent(m[1]));
      } catch {
        /* skip */
      }
    }
    return filterUrls(urls);
  } catch {
    return [];
  }
}

/** @param {string[]} queries @param {{ tavilyApiKey?: string, limit?: number }} [opts] */
async function discoverFromQueries(queries, opts = {}) {
  const limit = opts.limit ?? 8;
  /** @type {string[]} */
  const found = [];
  for (const q of queries) {
    if (found.length >= limit) break;
    const [tavily, jina, ddg, rss] = await Promise.all([
      discoverTavily(q, opts.tavilyApiKey),
      discoverJina(q, 4),
      discoverDuckDuckGo(q),
      discoverGoogleNewsRss(q, 6),
    ]);
    for (const u of [...rss, ...tavily, ...jina, ...ddg]) {
      if (found.length >= limit) break;
      if (!found.includes(u)) found.push(u);
    }
  }
  return filterUrls(found)
    .sort((a, b) => rankUrl(a) - rankUrl(b))
    .slice(0, limit);
}

/** @param {string} keyword @param {{ tavilyApiKey?: string, limit?: number, title?: string }} [opts] */
export async function discoverSourceUrls(keyword, opts = {}) {
  const queries = opts.title
    ? buildSearchQueries(keyword, opts.title)
    : buildSearchQueries(keyword);
  return discoverFromQueries(queries, opts);
}

/** @param {string} url */
async function canReadSource(url) {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: JINA_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.replace(/\s+/g, " ").trim().length >= 80;
  } catch {
    return false;
  }
}

/** @param {string[]} urls @param {number} minOk */
export async function pickReadableSources(urls, minOk = 2) {
  /** @type {string[]} */
  const ok = [];
  for (const url of urls) {
    if (ok.length >= minOk) break;
    if (await canReadSource(url)) ok.push(url);
  }
  return ok;
}

function scoreSpeechRelevance(record, keyword) {
  const terms = keyword.split(/[\s　]+/).filter(Boolean);
  const hay = `${record.speech ?? ""} ${record.nameOfMeeting ?? ""} ${record.speaker ?? ""}`;
  let score = 0;
  for (const t of terms) {
    if (hay.includes(t)) score += 3;
  }
  return score;
}

function isUsableSpeech(r) {
  if (!r.speech || r.speaker === "会議録情報") return false;
  const flat = r.speech.replace(/[\s\r\n　]/g, "");
  if (flat.includes("出席委員") && flat.includes("開議")) return false;
  return true;
}

/** @param {string} keyword */
export async function probeKokkai(keyword) {
  const from = "2023-01-01";
  const until = new Date().toISOString().slice(0, 10);
  /** @type {{ ok: false, hits: number, reason: string } | null} */
  let lastFail = null;

  for (const kw of kokkaiKeywordCandidates(keyword)) {
    const q = new URLSearchParams({
      recordPacking: "json",
      any: kw,
      from,
      until,
      maximumRecords: "30",
    });
    const res = await fetch(`https://kokkai.ndl.go.jp/api/speech?${q}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { ok: false, hits: 0, reason: "国会APIに接続できませんでした。" };
    }
    const data = await res.json();
    const records = (data.speechRecord ?? []).filter(isUsableSpeech);
    const relevant = records.filter((r) => scoreSpeechRelevance(r, kw) >= 3);
    const hits = relevant.length;
    if (hits >= 1) {
      return {
        ok: true,
        hits,
        total: parseInt(data.numberOfRecords ?? "0", 10),
        resolvedKeyword: kw,
        reason: null,
      };
    }
    lastFail = {
      ok: false,
      hits: 0,
      total: parseInt(data.numberOfRecords ?? "0", 10),
      reason: "国会議事録に、このキーワードで使える発言が見つかりませんでした。",
    };
  }

  return (
    lastFail ?? {
      ok: false,
      hits: 0,
      reason: "国会議事録に、このキーワードで使える発言が見つかりませんでした。",
    }
  );
}

/**
 * 生成前チェック（OK なら workflow 起動可）
 * @param {{ keyword: string, title?: string, slug?: string, env?: { TAVILY_API_KEY?: string } }} input
 */
export async function prepareArticleCreate(input) {
  const keyword = input.keyword?.trim();
  if (!keyword) {
    return { ok: false, error: "キーワードを入力してください。" };
  }

  const title = input.title?.trim() || defaultTitle(keyword);
  const slug = input.slug?.trim() || makeSlug(keyword);
  const tavilyApiKey = input.env?.TAVILY_API_KEY;
  const preferGeneral = shouldPreferGeneral(keyword, title);

  if (!preferGeneral) {
    const kokkai = await probeKokkai(keyword);
    if (kokkai.ok) {
      return {
        ok: true,
        slug,
        title,
        keyword,
        category: "国会",
        tags: "国会",
        sources: "",
        plan: `国会案件（議事録 ${kokkai.hits} 件ヒット）`,
      };
    }
  }

  const { category, tags } = classifyGeneralCategory(keyword, title);
  const candidates = await discoverSourceUrls(keyword, {
    tavilyApiKey,
    limit: 10,
    title,
  });

  if (candidates.length === 0 && !preferGeneral) {
    const kokkai = await probeKokkai(keyword);
    if (kokkai.ok) {
      return {
        ok: true,
        slug,
        title,
        keyword,
        category: "国会",
        tags: "国会",
        sources: "",
        plan: `国会案件（議事録 ${kokkai.hits} 件ヒット）`,
      };
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        "報道・公開ソースを自動で見つけられませんでした。\nキーワードを短くするか、しばらく待ってから再試行してください。",
      category,
    };
  }

  const readable = await pickReadableSources(candidates, 3);
  const usable =
    readable.length >= 3 ? readable : await pickReadableSources(candidates, 2);
  const final =
    usable.length >= 2 ? usable : await pickReadableSources(candidates, 1);
  if (final.length < 1) {
    return {
      ok: false,
      error:
        "ソースURLは見つかりましたが、本文を読み取れませんでした。\nしばらく待ってから再試行してください。",
      category,
      candidates: candidates.slice(0, 3),
    };
  }

  return {
    ok: true,
    slug,
    title,
    keyword,
    category,
    tags,
    sources: final.join(","),
    plan: `${category}案件（ソース ${final.length} 件を自動取得）`,
  };
}
