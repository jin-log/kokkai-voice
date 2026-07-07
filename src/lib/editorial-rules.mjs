/**
 * 編集ルール正本 — ownerPrinciples + 品質パターンの機械可読版
 * CLI: node scripts/lint-editorial.mjs --slug X
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isGeneralBoilerplateLine } from "./general-article.mjs";
import { articleTopicTerms, textMatchesTopic } from "./topic-relevance.mjs";
import { isXPostOnTopic } from "./timeline-sanitize.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @typedef {{ id: string, sectionIds: string[], title: string, instruction: string, severity: 'blocker'|'warn', detect: object }} EditorialRule */

/** @returns {{ rules: EditorialRule[] }} */
export function loadEditorialRules() {
  const raw = JSON.parse(readFileSync(path.join(root, "data/editorial-rules.json"), "utf8"));
  return { rules: raw.rules ?? [] };
}

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
  if (rule.id === "prin-general-no-jina" && isGeneralBoilerplateLine(t)) return true;
  return false;
}

function arcDuplicateSpeakerDateViolations(arc) {
  /** @type {{ date: string, speaker: string, count: number }[]} */
  const groups = [];
  const map = new Map();
  for (const row of arc ?? []) {
    const date = row?.date || "";
    const text = String(row?.text || "");
    const m = text.match(/^([^：:—\-]{1,12})[：:]/);
    const speaker = m ? m[1].trim() : "";
    if (!date || !speaker) continue;
    const key = `${date}|${speaker}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  for (const [key, count] of map) {
    if (count >= 2) {
      const [date, speaker] = key.split("|");
      groups.push({ date, speaker, count });
    }
  }
  return groups;
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
      text: String(e.summaryPlain || e.event || e.label || ""),
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

function offTopicXViolations(article) {
  /** @type {object[]} */
  const hits = [];
  const seen = new Set();
  for (const { field, text } of [
    ...sectionLines(article, "xPosts"),
    ...(article.timeline ?? [])
      .filter((e) => e.type === "x_post")
      .map((e, i) => ({
        field: `timeline[x${i}]`,
        text: String(e.xPost?.post_text || e.summaryPlain || ""),
      })),
  ]) {
    const t = String(text || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    if (!isXPostOnTopic(article, t)) {
      hits.push({ field, text: t });
    }
  }
  return hits;
}

/**
 * @param {unknown} article
 * @returns {{ ok: boolean, violations: object[], blockers: object[] }}
 */
export function lintArticle(article) {
  const { rules } = loadEditorialRules();
  /** @type {object[]} */
  const violations = [];

  for (const rule of rules) {
    for (const sectionId of rule.sectionIds ?? []) {
      for (const { field, text } of sectionLines(article, sectionId)) {
        if (!lineMatchesRule(text, rule)) continue;
        if (
          rule.id === "prin-summary-topic-match" &&
          textMatchesTopic(text, articleTopicTerms(article))
        ) {
          continue;
        }
        violations.push({
          ruleId: rule.id,
          severity: rule.severity || "blocker",
          sectionId,
          field,
          line: text.slice(0, 120),
          title: rule.title,
          instruction: rule.instruction,
        });
      }
    }
    if (rule.detect?.arcDuplicateSpeakerDate) {
      for (const dup of arcDuplicateSpeakerDateViolations(article.arcSummary)) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity || "warn",
          sectionId: "arcSummary",
          field: "arcSummary",
          line: `${dup.date} ${dup.speaker} ×${dup.count}`,
          title: rule.title,
          instruction: rule.instruction,
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
          instruction: rule.instruction,
        });
      }
    }
  }

  const blockers = violations.filter((v) => v.severity === "blocker");
  return { ok: blockers.length === 0, violations, blockers };
}

/** @param {string} text @param {string} [sectionId] */
export function lintLine(text, sectionId = "nowSummary") {
  const { rules } = loadEditorialRules();
  const hits = [];
  for (const rule of rules) {
    if (!rule.sectionIds?.includes(sectionId) && !rule.sectionIds?.includes("global")) continue;
    if (lineMatchesRule(text, rule)) {
      hits.push({ ruleId: rule.id, title: rule.title });
    }
  }
  return hits;
}
