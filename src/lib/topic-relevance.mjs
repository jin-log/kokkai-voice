/** 記事タイトル・要約が searchKeyword と一致しているか */

const PLACEHOLDER_TITLE = /具体疑問|に編集\)|あの話どうなった/;

const TOPIC_ALIASES = {
  日本国旗: ["国旗", "国旗損壊罪", "損壊罪", "刑法九十二条", "刑法92条", "連立合意", "連立政権"],
  国旗損壊罪: ["国旗", "損壊罪", "刑法九十二条", "刑法92条", "国旗損壊"],
  国会議員のボーナス: ["ボーナス", "歳費", "特別職", "期末手当", "給与法", "報酬", "議員報酬"],
  スパイ防止法: ["スパイ防止", "スパイ防止法制", "国家情報", "スパイ活動"],
  副首都構想: ["副首都", "大阪都構想", "大阪都", "首都機能", "一極集中", "副首都法案", "都構想"],
  大阪都構想: ["大阪都", "都構想", "特別区", "大阪市廃止", "法定協議会", "住民投票", "副首都構想", "大阪維新"],
  政権・内閣人事: ["高市内閣", "高市 内閣", "組閣", "内閣発足"],
  高市内閣: ["高市内閣", "高市 内閣", "組閣", "内閣発足"],
  物価高対策: ["物価", "物価高", "物価高騰", "予備費", "インフレ", "生活必需品", "物価対策"],
  防衛費: ["防衛力", "防衛予算", "軍事費", "国防"],
  "大阪万博 2025 費用": ["万博", "大阪万博", "EXPO2025", "2025", "入場者", "決算"],
  "不法移民 在留外国人数": ["不法移民", "在留外国人", "不法残留", "不法滞在", "オーバーステイ", "入管", "移民", "難民", "ゼロプラン"],
  "太陽光パネル 設置義務 東京都": ["太陽光", "設置義務", "東京都", "パネル", "ゼロエミ"],
  賃金: ["最低賃金", "賃上げ", "実質賃金", "春闘"],
  最低賃金: ["賃上げ", "時給", "地域別最低賃金", "審議会"],
  "最低賃金 2026 全国平均": ["最低賃金", "賃上げ", "時給", "全国平均"],
  能登半島地震: ["能登", "復興", "復興予算", "被災"],
  岸田政権: ["岸田内閣", "岸田文雄", "安保三文書", "防衛費", "定額減税", "こども未来戦略", "経済安全保障"],
};

/** @param {{ searchKeyword?: string, searchKeywords?: string[] }} article */
export function articleTopicTerms(article) {
  const base = topicTerms(article?.searchKeyword);
  const extras = (article?.searchKeywords || []).flatMap((k) => topicTerms(k));
  return [...new Set([...base, ...extras])].filter(Boolean);
}

/** 自動生成の空行（話題語なし） */
export const BOILERPLATE_TOPIC =
  /について国会で答弁・質疑を行った|が国会で答弁・質疑を行った|国会で答弁・質疑が継続|が国会で論じた。?$|を国会で論じた。?$|国会で答弁・質疑を行った。?$|国会で答弁・質疑した。?$|に関する.*での論点|議事録要確認|判断材料になる|が高市内閣の政策方針を国会答弁|関連法案が可決・成立|法制化・法案審議の継続を表明/;

export function isBoilerplateTopicLine(text) {
  return BOILERPLATE_TOPIC.test(String(text || "").trim());
}

/** 各行に案件語を必ず含める（定型文は案件語注入後に再判定） */
export function ensureTopicInLine(text, keyword) {
  let t = String(text || "").trim();
  if (!t) return null;
  if (!t.endsWith("。")) t += "。";
  const label = String(keyword || "").trim().slice(0, 28) || "本件";
  const terms = topicTerms(keyword);

  if (isBoilerplateTopicLine(t)) {
    const diet = t.match(/^(\d{4}-\d{2}-\d{2})：(.+?)が.+について国会で答弁・質疑を行った。$/);
    if (diet) {
      t = `${diet[1]}：${diet[2]}が${label}について国会で答弁・質疑した。`;
    } else if (!textMatchesTopic(t, terms)) {
      return null;
    }
  }

  if (textMatchesTopic(t, terms)) return t;
  if (/^[\d-]+：/.test(t)) {
    return t.replace(/^([\d-]+：)/, `$1${label}— `);
  }
  return `${label}：${t}`;
}

/** @param {string[]} lines @param {string} keyword */
export function ensureTopicInLines(lines, keyword) {
  return lines
    .map((l) => ensureTopicInLine(l, keyword))
    .filter(Boolean);
}

/** 弱い一致（「船の国旗」等）を除外する必須語 */
const TOPIC_STRONG = {
  日本国旗: ["損壊罪", "損壊", "法制化", "制定", "連立合意", "連立政権", "刑法九十二条", "刑法92条"],
  スパイ防止法: ["スパイ防止", "スパイ", "国家情報", "情報局", "諜報"],
  国会議員のボーナス: ["ボーナス", "歳費", "期末手当", "議員報酬", "議員", "報酬"],
  /** 「物価」だけの弱い一致（円安雑感＋皇室典範等）を弾く */
  物価高対策: [
    "8万",
    "八万",
    "年間8",
    "年8万",
    "電気・ガス",
    "電気ガス",
    "負担軽減",
    "物価高対策",
    "物価高への対応",
    "物価高騰",
    "重点支援地方交付金",
    "暫定税率",
    "激変緩和",
    "子育て応援手当",
    "予備費",
    "値引き",
    "物価高騰対策",
  ],
};

/** @param {string} keyword */
export function topicTerms(keyword) {
  const base = (keyword || "").trim();
  const parts = base.split(/[\s　]+/).filter((p) => p.length >= 2);
  const aliases = TOPIC_ALIASES[base] || [];
  return [...new Set([base, ...parts, ...aliases])].filter(Boolean);
}

/** 全角英数などを半角に寄せて照合（「８万円」↔「8万円」） */
function normalizeForTopicMatch(text) {
  return String(text || "").normalize("NFKC");
}

/** @param {string} text @param {string[]} terms */
export function textMatchesTopic(text, terms) {
  if (!text) return false;
  const hay = normalizeForTopicMatch(text);
  return terms.some((t) => {
    const needle = normalizeForTopicMatch(t);
    return needle.length >= 2 && hay.includes(needle);
  });
}

/** 案件の核心語を含むか（経緯・〇×用） */
export function textStronglyMatchesTopic(text, keyword) {
  const terms = topicTerms(keyword);
  if (!textMatchesTopic(text, terms)) return false;
  const strong = TOPIC_STRONG[keyword];
  if (!strong) return true;
  const hay = normalizeForTopicMatch(text);
  return strong.some((t) => hay.includes(normalizeForTopicMatch(t)));
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

const INCOMPLETE_END = /(今後|おりませんが|について|に対し|とは|では|が、|を、|は、|下|ともに)。$/;
const VERBATIM_OPENERS = null;
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}[：:]\s*/;

/** 重複判定用 — 日付プレフィックスを除いた本文キー */
function conclusionBodyKey(line) {
  return String(line)
    .trim()
    .replace(DATE_PREFIX, "")
    .replace(/[、。…\s]/g, "")
    .slice(0, 24);
}

/** @param {string[]} bullets — 1行以上で可（必ず3行ではない）。重複・途中切れ・定型のみ弾く */
export function isConclusionQuality(bullets) {
  if (!bullets?.length) return false;
  const normalized = bullets.map((b) => String(b).trim()).filter((b) => b.length >= 12);
  if (normalized.length < 1) return false;

  const keys = new Set();
  for (const b of normalized) {
    if (isBoilerplateTopicLine(b)) return false;
    if (INCOMPLETE_END.test(b)) return false;
    if (VERBATIM_OPENERS && VERBATIM_OPENERS.test(b) && b.length < 28) return false;
    const key = conclusionBodyKey(b);
    if (key.length < 8) return false;
    for (const prev of keys) {
      if (prev.startsWith(key.slice(0, 14)) || key.startsWith(prev.slice(0, 14))) return false;
    }
    keys.add(key);
  }
  return true;
}

/** 国会タイムライン件数（話題一致は別） */
export function countDietTimelineEntries(article) {
  const tl = article.timeline ?? [];
  return tl.filter(
    (e) =>
      e.type === "speech" &&
      e.speech?.speechURL?.includes("kokkai.ndl.go.jp"),
  ).length;
}

/** いまの結論に実質1行以上あるか */
export function hasSubstantiveConclusion(article) {
  const bullets = article.nowSummary?.bullets ?? [];
  return bullets.some((b) => String(b).trim().length >= 12);
}

/**
 * 国会TLの話題一致 — ある分だけでOK。TLなしもOK。
 * TLはあるのに話題一致ゼロで結論だけあるのはNG。
 * @param {import('./articles.mjs').Article} article
 */
export function isDietTimelineTopicOk(article) {
  const dietTotal = countDietTimelineEntries(article);
  if (dietTotal === 0) return true;
  const matched = countTopicDietTimeline(article);
  if (matched >= 1) return true;
  return !hasSubstantiveConclusion(article);
}

/**
 * 〇×表 — 1党以上が話題一致していればOK（党データが無い場合は別チェック）
 * @param {object|null} policyMatrix @param {string} keyword
 */
export function isMatrixTopicRelevant(policyMatrix, keyword) {
  if (!policyMatrix?.parties?.length) return true;
  const withTopic = policyMatrix.parties.filter((p) =>
    textStronglyMatchesTopic(String(p.stance?.text || ""), keyword),
  );
  return withTopic.length >= 1;
}

/**
 * 〇×に話題一致が無いのに結論だけある状態を弾く
 * @param {import('./articles.mjs').Article} article
 * @param {object|null} policyMatrix
 */
export function isMatrixTopicConsistent(article, policyMatrix) {
  if (!policyMatrix?.parties?.length) return true;
  if (isMatrixTopicRelevant(policyMatrix, article.searchKeyword)) return true;
  return !hasSubstantiveConclusion(article);
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
