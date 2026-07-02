/**
 * OGP パターン選択 — 記事データから最適テンプレを決定
 */

/** @param {string} text */
export function extractOgNumber(text) {
  const t = String(text);
  const m =
    t.match(/(?:約|およそ)?[\d,，０-９]+(?:[\.．][\d,，０-９]+)?(?:兆|億|万)?円/) ||
    t.match(/(?:約|およそ)?[\d,，０-９]+(?:[\.．][\d,，０-９]+)?万[\d,，０-９]*人/) ||
    t.match(/(?:約|およそ)?[\d,，０-９]+(?:[\.．][\d,，０-９]+)?(?:兆|億|万)?人/) ||
    t.match(/(?:約|およそ)?[\d,，０-９]+(?:[\.．][\d,，０-９]+)?[%％]/) ||
    t.match(/(?:約|およそ)?[一二三四五六七八九十百千万]+(?:兆|億|万)?円/);
  return m ? m[0].replace(/,/g, "") : null;
}

/** @param {string} excerpt */
function isSubstantiveQuote(excerpt) {
  const t = String(excerpt).trim();
  if (t.length < 40) return false;
  if (/^[○◎▲▼■□◆◇]/.test(t)) return false;
  if (/というふうに承知|お答えいたします|質問の機会|よろしくお願い|ありがとうございます/.test(t)) {
    return false;
  }
  if (/^本日も/.test(t)) return false;
  return true;
}

/** @param {import('./articles.mjs').Article} article */
export function pickOgPattern(article) {
  if (article.ogPattern && ["title", "hook", "quote", "number"].includes(article.ogPattern)) {
    return article.ogPattern;
  }
  const bullets = article.nowSummary?.bullets ?? [];
  for (const line of bullets) {
    if (extractOgNumber(line)) return "number";
  }
  const bullet = bullets[0] || "";
  if (bullet) return "hook";
  if (isSubstantiveQuote(article.primarySpeech?.excerpt)) return "quote";
  return "title";
}

/** @param {string} slug @param {string} [assetV] */
export function ogImagePaths(slug, assetV = "") {
  const q = assetV ? `?v=${assetV}` : "";
  const base = `/assets/og/${slug}`;
  return {
    primary: `${base}.png${q}`,
    title: `${base}.png${q}`,
    hook: `${base}-hook.png${q}`,
    quote: `${base}-quote.png${q}`,
    number: `${base}-number.png${q}`,
  };
}

/** @param {import('./articles.mjs').Article} article @param {string} [assetV] */
export function buildOgAssetBrief(article, assetV = "") {
  const pattern = pickOgPattern(article);
  const paths = ogImagePaths(article.slug, assetV);
  const ogImageMeta = paths[pattern] || paths.primary;
  return {
    primaryPattern: pattern,
    recommendedForX: paths[pattern] || paths.hook,
    files: [
      { pattern: "title", path: paths.title, use: "汎用・フォールバック" },
      { pattern: "hook", path: paths.hook, use: "新規公開・追記告知（推奨）" },
      { pattern: "quote", path: paths.quote, use: "国会発言が強いとき" },
      { pattern: "number", path: paths.number, use: "数字・％が刺さるとき" },
    ],
    ogImageMeta,
  };
}
