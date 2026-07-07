/**
 * 一般記事（国会以外）— Jina ゴミ検出・メリデメから要約再構成
 */
import { textMatchesTopic, topicTerms } from "./topic-relevance.mjs";

/** @param {string} text */
export function stripJinaGarbage(text) {
  let t = String(text || "").trim();
  t = t.replace(/^Title:\s*/i, "");
  t = t.replace(/^URL\s*(Source)?:\s*\S+\s*/i, "");
  t = t.replace(/^Published\s+Time:\s*[^\n]+\s*/i, "");
  t = t.replace(/^[-–—]\s*/, "");
  t = t.replace(/\s*\|\s*[^|]{2,80}$/, "").trim();
  return t.trim();
}

/** @param {string} text */
export function isGeneralBoilerplateLine(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 10) return true;
  if (/^Title:\s*/i.test(t)) return true;
  if (/^URL\s*(Source)?:/i.test(t)) return true;
  if (/^Published\s+Time:/i.test(t)) return true;
  if (/出典\s*\d+\s*件/.test(t)) return true;
  if (/時点の公開情報に基づく整理/.test(t)) return true;
  if (/を登録$/.test(t)) return true;
  if (/について報道・公開情報を整理中/.test(t)) return true;
  if (/ソースURLを追加してください/.test(t)) return true;
  if (/^\*\s*\[/.test(t)) return true;
  if (/^\[.+\]\(https?:\/\//.test(t)) return true;
  if (/^https?:\/\//.test(t)) return true;
  return false;
}

/** @param {Record<string, unknown>} article */
export function generalSummaryIsBad(article) {
  const bullets = article?.nowSummary?.bullets ?? [];
  if (bullets.length < 2) return true;
  if (bullets.some(isGeneralBoilerplateLine)) return true;
  const sb = article?.summaryBullets ?? [];
  if (sb.length < 2 || sb.some(isGeneralBoilerplateLine)) return true;
  const arc = (article?.arcSummary ?? []).filter((x) => x?.text && !isGeneralBoilerplateLine(x.text));
  if (arc.length < 2) return true;
  return false;
}

/** @param {Record<string, unknown>} article */
export function hasGeneralMeritPool(article) {
  const pool = [
    ...(article?.meritsDemerits?.merits ?? []),
    ...(article?.meritsDemerits?.demerits ?? []),
    ...(article?.prosCons?.merits ?? []),
    ...(article?.prosCons?.demerits ?? []),
  ];
  return pool.filter((m) => String(m?.text || m?.headline || "").length >= 16).length >= 2;
}

/**
 * メリデメ・出典付き事実から要約ブロックを再構成
 * @param {Record<string, unknown>} article
 * @returns {boolean}
 */
export function rebuildGeneralSummaryFromMerits(article) {
  const pool = [
    ...(article.meritsDemerits?.merits ?? []),
    ...(article.meritsDemerits?.demerits ?? []),
    ...(article.prosCons?.merits ?? []),
    ...(article.prosCons?.demerits ?? []),
  ];
  /** @type {{ date: string, text: string, sourceUrl: string, score: number }[]} */
  const facts = [];
  const seen = new Set();

  for (const item of pool) {
    const raw = String(item.text || item.headline || "").trim();
    const text = stripJinaGarbage(raw);
    if (!text || text.length < 16 || isGeneralBoilerplateLine(text)) continue;
    const key = text.replace(/[、。…\s]/g, "").slice(0, 28);
    if (seen.has(key)) continue;
    seen.add(key);
    let score = 1;
    if (/\d+[\.．]?\d*\s*[％%]/.test(text)) score += 3;
    if (/\d+億|可決|否決|投票|協議会/.test(text)) score += 2;
    facts.push({
      date: String(item.sourceDate || "").slice(0, 10),
      text: text.endsWith("。") ? text : `${text}。`,
      sourceUrl: String(item.sourceUrl || ""),
      score,
    });
  }

  facts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.date || "").localeCompare(a.date || "");
  });

  if (facts.length < 2) return false;

  const nowBullets = facts.slice(0, 3).map((f) => f.text);
  const keyword = String(article.searchKeyword || article.title || "").trim();

  /** @type {{ date: string, text: string }[]} */
  const arcRows = facts
    .filter((f) => f.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((f) => ({ date: f.date, text: f.text }));

  const arcDeduped = [];
  const arcSeen = new Set();
  for (const row of arcRows) {
    const k = row.text.slice(0, 32);
    if (arcSeen.has(k)) continue;
    arcSeen.add(k);
    arcDeduped.push(row);
  }

  const summaryBullets = arcDeduped.slice(-3).map((r) => `${r.date}：${r.text}`);

  const timeline = facts
    .filter((f) => f.sourceUrl && f.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((f, i) => ({
      id: `${article.slug}-fact-${i}`,
      type: "source",
      date: f.date,
      summaryPlain: f.text,
      sourceUrl: f.sourceUrl,
    }));

  const primary = timeline[0] || facts[0];
  article.nowSummary = {
    ...(article.nowSummary || {}),
    label: article.nowSummary?.label || "いまの結論",
    bullets: nowBullets,
    updatedAt: new Date().toISOString(),
  };
  article.summaryBullets = summaryBullets.length >= 2 ? summaryBullets : nowBullets;
  article.arcSummary = arcDeduped.length >= 2 ? arcDeduped : arcDeduped;
  if (timeline.length >= 1) article.timeline = timeline;
  article.primarySpeech = {
    ...(article.primarySpeech || {}),
    date: primary.date || article.primarySpeech?.date,
    nameOfHouse: article.category || "公開ソース",
    nameOfMeeting: "報道・公開情報",
    excerpt: primary.text,
    speechURL: primary.sourceUrl || article.primarySpeech?.speechURL,
    speechFull: null,
  };
  article.plainExplanation = `${keyword}について、公開されている報道・試算を時系列で整理しています。\n\n${nowBullets.map((b) => `・${b}`).join("\n")}\n\nここでの要約は出典の見出し・リード文を平易に並べたものです。事実認定や有罪・無罪の判断はしていません。`;
  return true;
}

/**
 * 一般記事の〇×表をメリデメ・出典から再構成（Jinaゴミ・定型文禁止）
 * @param {Record<string, unknown>} article
 * @param {{ url: string, snippet?: string, date?: string }[]} [sources]
 * @returns {object|null}
 */
export function buildGeneralPolicyMatrix(article, sources = []) {
  const merits = [
    ...(article.meritsDemerits?.merits ?? []),
    ...(article.prosCons?.merits ?? []),
  ];
  const demerits = [
    ...(article.meritsDemerits?.demerits ?? []),
    ...(article.prosCons?.demerits ?? []),
  ];

  const factText = (item) => {
    const t = stripJinaGarbage(String(item?.text || item?.headline || ""));
    return t && !isGeneralBoilerplateLine(t) ? (t.endsWith("。") ? t : `${t}。`) : "";
  };

  const keyword = String(article.searchKeyword || "").trim();
  const terms = topicTerms(keyword);
  const withTopic = (text) => {
    if (!text) return "";
    if (keyword && !textMatchesTopic(text, terms)) {
      return `${keyword}：${text}`;
    }
    return text;
  };

  const pro = withTopic(merits.map(factText).find((t) => t.length >= 20));
  const proAction = withTopic(merits.map(factText).filter((t) => t.length >= 20)[1] || pro);
  const con = withTopic(demerits.map(factText).find((t) => t.length >= 20));
  const conAction = withTopic(demerits.map(factText).filter((t) => t.length >= 20)[1] || con);

  const src = (item, i) => ({
    url: String(item?.sourceUrl || sources[i]?.url || ""),
    date: String(item?.sourceDate || sources[i]?.date || "").slice(0, 10),
  });

  if (!pro || !con) return null;

  const proRef = merits.find((m) => factText(m) === pro) || merits[0];
  const conRef = demerits.find((m) => factText(m) === con) || demerits[0];
  const proSrc = src(proRef, 0);
  const conSrc = src(conRef, 1);

  const today = new Date().toISOString().slice(0, 10);
  return {
    policySlug: article.slug,
    policyLabel: String(article.title || article.slug).replace(/ — あの話どうなった？$/, ""),
    relatedArticleSlug: article.slug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v2-merits",
    disclaimer: "報道・公表資料に基づく整理表です。党・団体の公式評価ではありません。",
    excerpt: { parties: "メリデメ・出典から自動構成（2立場）", politicians: "" },
    parties: [
      {
        partyLabel: "推進・賛成側",
        stance: {
          text: pro,
          sourceUrl: proSrc.url,
          sourceType: "報道",
          capturedAt: proSrc.date || today,
        },
        action: {
          text: proAction || pro,
          speechUrl: proSrc.url,
          capturedAt: proSrc.date || today,
        },
        symbol: "▲",
        symbolReason: "推進側の公表・報道に基づく整理（進行中）",
      },
      {
        partyLabel: "慎重・反対側",
        stance: {
          text: con,
          sourceUrl: conSrc.url,
          sourceType: "報道",
          capturedAt: conSrc.date || today,
        },
        action: {
          text: conAction || con,
          speechUrl: conSrc.url,
          capturedAt: conSrc.date || today,
        },
        symbol: "×",
        symbolReason: "反対・懸念の公表・試算に基づく整理",
      },
    ],
  };
}
