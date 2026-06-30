/**
 * 心に響くタイトル・ショート冒頭2秒フック（中立・事実ベース）
 * 正本: .cursor/skills/kokkai-headlines / kokkai-short-hook
 */

const MAX_TELOP_CHARS = 14;
const MAX_TITLE_CHARS = 42;

/** @param {string} text @param {number} max */
export function truncateChars(text, max) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {string} title
 * @returns {string}
 */
export function extractBracketCore(title) {
  const m = (title || "").match(/【([^】]+)】/);
  if (m) return m[1].trim();
  return stripLegacySuffix(title);
}

/** @param {string} title */
export function stripLegacySuffix(title) {
  return (title || "").replace(/\s*—\s*あの話どうなった？\s*$/, "").trim();
}

/**
 * @param {string} text
 * @returns {string | null}
 */
export function firstNumberHook(text) {
  const m = (text || "").match(/(\d+(?:\.\d+)?(?:兆|億|万|%|円|人|件|年|カ月|ヶ月)?)/);
  return m?.[1] ?? null;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @returns {{ telop: string[], narr: string }}
 */
export function buildShortHook(article) {
  const title = stripLegacySuffix(article.title || "");
  const core = extractBracketCore(title);
  const bullets = article.nowSummary?.bullets ?? [];
  const b0 = String(bullets[0] ?? "").replace(/（[^）]+）/g, "").trim();
  const num = firstNumberHook(`${title} ${b0}`);

  if (title.includes("？")) {
    const q = truncateChars(title.replace(/^【[^】]+】/, "").trim() || title, 36);
    return {
      telop: splitTelopTwo(q, MAX_TELOP_CHARS),
      narr: q.endsWith("？") ? q : `${q}？`,
    };
  }

  if (num && core) {
    const line1 = truncateChars(`${num}なのに`, MAX_TELOP_CHARS);
    const line2 = truncateChars(`${core}は？`, MAX_TELOP_CHARS);
    return {
      telop: [line1, line2],
      narr: `${num}。${core}、いまどうなってる？`,
    };
  }

  if (b0) {
    return {
      telop: splitTelopTwo(b0, MAX_TELOP_CHARS),
      narr: truncateChars(`${core || article.searchKeyword}、${b0}`, 48),
    };
  }

  const kw = article.searchKeyword || core || article.slug;
  return {
    telop: splitTelopTwo(`${kw}どうなった？`, MAX_TELOP_CHARS),
    narr: `${kw}、あの話どうなった？`,
  };
}

/**
 * @param {import('./articles.mjs').Article} article
 * @returns {string[]}
 */
export function suggestTitleCandidates(article) {
  const core = extractBracketCore(article.title || "") || article.searchKeyword || article.slug;
  const bullets = article.nowSummary?.bullets ?? [];
  const b0 = String(bullets[0] ?? "").replace(/（[^）]+）/g, "").trim();
  const num = firstNumberHook(`${article.title} ${b0}`);

  /** @type {string[]} */
  const out = [];

  if (num) {
    out.push(truncateChars(`【${core}】${num}、いまどうなった？`, MAX_TITLE_CHARS));
  }
  if (b0 && b0.length > 8) {
    out.push(truncateChars(`【${core}】${b0}`, MAX_TITLE_CHARS));
  }
  out.push(truncateChars(`【${core}】とは？争点と最新`, MAX_TITLE_CHARS));
  out.push(truncateChars(`【${core}】公約と現状のギャップ`, MAX_TITLE_CHARS));

  return [...new Set(out)].slice(0, 4);
}

/** @param {string} text @param {number} max */
function splitTelopTwo(text, max) {
  if (text.length <= max) return [text];

  const cuts = ["、", "。", "？", "！", "・", "は", "が", "を", "に"];
  const mid = Math.ceil(text.length / 2);
  let best = -1;
  let bestScore = Infinity;

  for (let i = 1; i < text.length; i++) {
    const a = text.slice(0, i).trim();
    const b = text.slice(i).trim();
    if (!a || !b || b.length <= 1) continue;
    const dist = Math.abs(i - mid);
    const bonus = cuts.includes(text[i - 1]) ? -2 : 0;
    const score = dist + bonus;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }

  if (best > 0) {
    return [text.slice(0, best).trim(), text.slice(best).trim()].filter(Boolean);
  }

  return [text.slice(0, max), text.slice(max)].filter((s) => s.length > 1);
}
