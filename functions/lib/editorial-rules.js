/**
 * 編集ルール lint（Functions — data/editorial-rules.json と同期）
 */
import rulesPayload from "../data/editorial-rules.json";

const PROCEDURAL_TOPIC =
  /起立を求め|両件は承諾|御異議ありませんか|採決いたしまして|委員長が報告/;

function stripLinePrefix(line) {
  return String(line || "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^[・•\-]\s*/, "")
    .trim();
}

function lineMatchesRule(text, rule) {
  const t = stripLinePrefix(text);
  if (!t) return false;
  const detect = rule.detect ?? {};
  const unless = (detect.unless ?? []).some((pat) => new RegExp(pat).test(t));
  if (unless) return false;
  if ((detect.lineRegex ?? []).some((pat) => new RegExp(pat).test(t))) return true;
  if (rule.id === "prin-general-no-jina" && /^Title:\s|出典\s*\d+\s*件|時点の公開情報/.test(t)) {
    return true;
  }
  return false;
}

function articleTopicTerms(article) {
  const base = String(article?.searchKeyword || "").trim();
  const parts = base.split(/[\s　]+/).filter((p) => p.length >= 2);
  const extras = (article?.searchKeywords || []).flatMap((k) => String(k).split(/[\s　]+/));
  return [...new Set([base, ...parts, ...extras])].filter(Boolean);
}

function textMatchesTopic(text, terms) {
  const t = String(text || "");
  return terms.some((term) => term.length >= 2 && t.includes(term));
}

const TOPIC_ALIASES = {
  賃金: ["最低賃金", "賃上げ", "実質賃金", "春闘"],
  最低賃金: ["賃上げ", "時給", "地域別最低賃金", "審議会"],
  "最低賃金 2026 全国平均": ["最低賃金", "賃上げ", "時給", "全国平均"],
};

function topicTerms(keyword) {
  const base = String(keyword || "").trim();
  const parts = base.split(/[\s　]+/).filter((p) => p.length >= 2);
  const aliases = TOPIC_ALIASES[base] || [];
  return [...new Set([base, ...parts, ...aliases])].filter(Boolean);
}

function articleTopicTermsFull(article) {
  const base = topicTerms(article?.searchKeyword);
  const extras = (article?.searchKeywords || []).flatMap((k) => topicTerms(k));
  return [...new Set([...base, ...extras])].filter(Boolean);
}

function isXPostOnTopic(article, text) {
  return textMatchesTopic(text, articleTopicTermsFull(article));
}

function offTopicXViolations(article) {
  const hits = [];
  const seen = new Set();
  for (const p of article.xPosts ?? []) {
    const text = String(p.post_text || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    if (!isXPostOnTopic(article, text)) {
      hits.push({ field: `xPosts[${p.slot}]`, text });
    }
  }
  for (const [i, e] of (article.timeline ?? []).entries()) {
    if (e.type !== "x_post") continue;
    const text = String(e.xPost?.post_text || e.summaryPlain || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    if (!isXPostOnTopic(article, text)) {
      hits.push({ field: `timeline[${i}]`, text });
    }
  }
  return hits;
}

function sectionLines(article, sectionId) {
  if (sectionId === "nowSummary") {
    return (article.nowSummary?.bullets ?? []).map((b) => ({ field: "nowSummary", text: String(b) }));
  }
  if (sectionId === "summaryBullets") {
    return (article.summaryBullets ?? []).map((b, i) => ({
      field: `summaryBullets[${i}]`,
      text: typeof b === "string" ? b : String(b?.text || ""),
    }));
  }
  if (sectionId === "arcSummary") {
    return (article.arcSummary ?? []).map((a, i) => ({
      field: `arcSummary[${i}]`,
      text: typeof a === "string" ? a : `${a?.date || ""} — ${a?.text || ""}`,
    }));
  }
  if (sectionId === "timeline") {
    return (article.timeline ?? []).map((e, i) => ({
      field: `timeline[${i}]`,
      text: String(e.summaryPlain || ""),
    }));
  }
  if (sectionId === "xPosts") {
    return (article.xPosts ?? []).map((p, i) => ({
      field: `xPosts[${i}]`,
      text: String(p.post_text || ""),
    }));
  }
  return [];
}

export function lintArticle(article) {
  const rules = rulesPayload.rules ?? [];
  const violations = [];

  for (const rule of rules) {
    for (const sectionId of rule.sectionIds ?? []) {
      for (const { field, text } of sectionLines(article, sectionId)) {
        if (!lineMatchesRule(text, rule)) continue;
        if (rule.id === "prin-summary-topic-match" && textMatchesTopic(text, articleTopicTerms(article))) {
          continue;
        }
        if (rule.id === "prin-summary-topic-match" && !PROCEDURAL_TOPIC.test(text)) continue;
        violations.push({
          ruleId: rule.id,
          severity: rule.severity || "blocker",
          sectionId,
          field,
          line: text.slice(0, 120),
          title: rule.title,
        });
      }
    }
    if (rule.id === "prin-timeline-x-topic") {
      for (const { field, text } of offTopicXViolations(article)) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity || "blocker",
          sectionId: "xPosts",
          field,
          line: text.slice(0, 120),
          title: rule.title,
        });
      }
    }
  }

  const blockers = violations.filter((v) => v.severity === "blocker");
  return { ok: blockers.length === 0, violations, blockers };
}
