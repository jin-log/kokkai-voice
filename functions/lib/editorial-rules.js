/**
 * 編集ルール lint（Functions — data/editorial-rules.json と同期）
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rulesPayload = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/editorial-rules.json"), "utf8"),
);

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
  }

  const blockers = violations.filter((v) => v.severity === "blocker");
  return { ok: blockers.length === 0, violations, blockers };
}
