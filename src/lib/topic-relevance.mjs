/** 記事タイトル・要約が searchKeyword と一致しているか */

const PLACEHOLDER_TITLE = /具体疑問|に編集\)|あの話どうなった/;

const TOPIC_ALIASES = {
  日本国旗: ["国旗", "国旗損壊罪", "損壊罪", "刑法九十二条", "刑法92条", "連立合意", "連立政権"],
  国旗損壊罪: ["国旗", "損壊罪", "刑法九十二条", "刑法92条", "国旗損壊"],
  国会議員のボーナス: ["ボーナス", "歳費", "特別職", "期末手当", "給与法", "報酬", "議員報酬"],
  スパイ防止法: ["スパイ防止", "スパイ防止法制", "国家情報", "スパイ活動"],
};

/** 弱い一致（「船の国旗」等）を除外する必須語 */
const TOPIC_STRONG = {
  日本国旗: ["損壊罪", "損壊", "法制化", "制定", "連立合意", "連立政権", "刑法九十二条", "刑法92条"],
  スパイ防止法: ["スパイ防止", "スパイ", "国家情報", "情報局", "諜報"],
  国会議員のボーナス: ["ボーナス", "歳費", "期末手当", "議員報酬", "議員", "報酬"],
};

/** @param {string} keyword */
export function topicTerms(keyword) {
  const base = (keyword || "").trim();
  const parts = base.split(/[\s　]+/).filter((p) => p.length >= 2);
  const aliases = TOPIC_ALIASES[base] || [];
  return [...new Set([base, ...parts, ...aliases])].filter(Boolean);
}

/** @param {string} text @param {string[]} terms */
export function textMatchesTopic(text, terms) {
  if (!text) return false;
  return terms.some((t) => t.length >= 2 && text.includes(t));
}

/** 案件の核心語を含むか（経緯・〇×用） */
export function textStronglyMatchesTopic(text, keyword) {
  const terms = topicTerms(keyword);
  if (!textMatchesTopic(text, terms)) return false;
  const strong = TOPIC_STRONG[keyword];
  if (!strong) return true;
  return strong.some((t) => text.includes(t));
}

/** @param {string} keyword */
export function getTopicTerms(keyword) {
  return topicTerms(keyword);
}

/** arc / timeline / matrix の話題一致行数 */
export function countTopicArcLines(article) {
  const keyword = article.searchKeyword;
  const arc = article.arcSummary ?? [];
  return arc.filter((x) => x?.text && textStronglyMatchesTopic(String(x.text), keyword)).length;
}

export function countTopicDietTimeline(article) {
  const keyword = article.searchKeyword;
  const tl = article.timeline ?? [];
  return tl.filter(
    (e) =>
      e.type === "speech" &&
      e.speech?.speechURL?.includes("kokkai.ndl.go.jp") &&
      textStronglyMatchesTopic(String(e.summaryPlain || ""), keyword),
  ).length;
}

/** @param {object|null} policyMatrix @param {string} keyword */
export function isMatrixTopicRelevant(policyMatrix, keyword) {
  if (!policyMatrix?.parties?.length) return false;
  const withTopic = policyMatrix.parties.filter((p) =>
    textStronglyMatchesTopic(String(p.stance?.text || ""), keyword),
  );
  return withTopic.length >= 2;
}

const INCOMPLETE_END = /(今後|おりませんが|について|に対し|とは|では|が、|を、|は、|下|ともに)。$/;
const VERBATIM_OPENERS = null;

/** @param {string[]} bullets */
export function isConclusionQuality(bullets) {
  if (!bullets || bullets.length < 3) return false;
  const normalized = bullets.map((b) => String(b).trim()).filter((b) => b.length >= 12);
  if (normalized.length < 3) return false;

  const keys = new Set();
  for (const b of normalized) {
    if (INCOMPLETE_END.test(b)) return false;
    if (VERBATIM_OPENERS && VERBATIM_OPENERS.test(b) && b.length < 28) return false;
    const key = b.replace(/[、。…\s]/g, "").slice(0, 20);
    for (const prev of keys) {
      if (prev.startsWith(key.slice(0, 14)) || key.startsWith(prev.slice(0, 14))) return false;
    }
    keys.add(key);
  }
  return true;
}

/** @param {import('./articles.mjs').Article} article */
export function isTitleReady(article) {
  const title = article.title || "";
  if (!title.trim()) return false;
  if (PLACEHOLDER_TITLE.test(title)) return false;
  return true;
}

/** @param {import('./articles.mjs').Article} article */
export function countTopicBullets(article) {
  const terms = topicTerms(article.searchKeyword);
  const bullets = article.nowSummary?.bullets ?? [];
  let count = bullets.filter((b) => textMatchesTopic(String(b), terms)).length;
  return count;
}

/** @param {import('./articles.mjs').Article} article */
export function isTopicRelevant(article) {
  if (!isTitleReady(article)) return false;
  const terms = topicTerms(article.searchKeyword);
  const bullets = article.nowSummary?.bullets ?? [];
  const relevantBullets = bullets.filter((b) => textMatchesTopic(String(b), terms)).length;
  const excerpt = article.primarySpeech?.excerpt || "";
  const speechHit = textMatchesTopic(excerpt, terms);
  return relevantBullets >= 2 && speechHit;
}
