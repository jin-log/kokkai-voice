/**
 * 記事生成前の自動判定（カテゴリ・ソースURL・国会API）
 * dispatch（CF Pages）と scripts（Node）の両方から利用
 */

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

/** @param {string} keyword */
export function defaultTitle(keyword) {
  return `${keyword.trim()} — あの話どうなった？`;
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
  if (/知事|都議|県|市長|区長|都政|府知事|道知事|県知事/.test(k)) {
    return { category: "地方", tags: "地方" };
  }
  return { category: "行政", tags: "行政" };
}

function filterUrls(urls) {
  return [...new Set(urls)].filter(
    (u) => u && /^https?:\/\//.test(u) && !BLOCK_HOST.test(u),
  );
}

function rankUrl(url) {
  if (NEWS_HOST.test(url)) return 0;
  if (/\.go\.jp/.test(url)) return 1;
  return 2;
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

/** @param {string} keyword @param {{ tavilyApiKey?: string }} [opts] */
export async function discoverSourceUrls(keyword, opts = {}) {
  const limit = opts.limit ?? 6;
  const [tavily, jina, ddg] = await Promise.all([
    discoverTavily(keyword, opts.tavilyApiKey),
    discoverJina(keyword, limit),
    discoverDuckDuckGo(keyword),
  ]);
  return filterUrls([...tavily, ...jina, ...ddg])
    .sort((a, b) => rankUrl(a) - rankUrl(b))
    .slice(0, limit);
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
  const q = new URLSearchParams({
    recordPacking: "json",
    any: keyword.trim(),
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
  const relevant = records.filter((r) => scoreSpeechRelevance(r, keyword) >= 3);
  const hits = relevant.length;
  return {
    ok: hits >= 1,
    hits,
    total: parseInt(data.numberOfRecords ?? "0", 10),
    reason:
      hits >= 1
        ? null
        : "国会議事録に、このキーワードで使える発言が見つかりませんでした。",
  };
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

  const { category, tags } = classifyGeneralCategory(keyword, title);
  const candidates = await discoverSourceUrls(keyword, { tavilyApiKey, limit: 8 });

  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        "報道ソースを自動で見つけられませんでした。\nキーワードを短くするか、しばらく待ってから再試行してください。",
      category,
    };
  }

  const readable = await pickReadableSources(candidates, 2);
  if (readable.length < 2) {
    return {
      ok: false,
      error:
        "ソースURLは候補できましたが、本文を2件以上読み取れませんでした。\nしばらく待ってから再試行してください。",
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
    sources: readable.join(","),
    plan: `${category}案件（ソース ${readable.length} 件を自動取得）`,
  };
}
