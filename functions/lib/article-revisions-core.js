import { sanitizeTimelineArticle, formatTimelineReviseText } from "./timeline-sanitize.js";
import { lintArticle } from "./editorial-rules.js";
import { buildStanceProposalText, applyStanceProposal } from "./revise-stance-format.js";
import { getSectionTemplate } from "./revise-section-templates.js";
import {
  buildImpactProposalText,
  buildStatsProposalText,
  formatImpactReviseText,
  formatStatsReviseText,
  parseImpactApplyText,
  parseStatsApplyText,
} from "./revise-analytical-format.js";

export const APPLIABLE_SECTIONS = new Set([
  "title_opening",
  "nowSummary",
  "summaryBullets",
  "arcSummary",
  "timeline",
  "stance",
  "xPosts",
  "glossary",
  "prosCons",
  "impact",
  "statsSeries",
]);

export { getSectionTemplate, applyStanceProposal };

export function normalizeRevisionStore(store) {
  const jobs = Array.isArray(store?.jobs) ? store.jobs : [];
  const rules = Array.isArray(store?.rules) ? store.rules : [];
  let ownerInstructions = Array.isArray(store?.ownerInstructions)
    ? store.ownerInstructions
    : [];

  const ownerPrinciples = Array.isArray(store?.ownerPrinciples) ? store.ownerPrinciples : [];

  if (ownerInstructions.length === 0 && jobs.length > 0) {
    ownerInstructions = backfillOwnerInstructionsFromJobs(jobs);
  }

  return {
    generatedAt: new Date().toISOString(),
    jobs,
    rules,
    ownerInstructions,
    ownerPrinciples,
  };
}

/**
 * オーナー修正依頼の原文 — ルール化用に追記のみ（削除しない）
 * @param {ReturnType<typeof normalizeRevisionStore>} store
 * @param {{ slug: string, sectionId: string, text: string, jobId: string, articleTitle?: string }} input
 */
export function recordOwnerInstruction(store, input) {
  const text = String(input.text || "").trim();
  if (!text) return null;

  const entry = {
    id: `ins-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    slug: input.slug,
    sectionId: input.sectionId,
    text,
    jobId: input.jobId,
    articleTitle: input.articleTitle || null,
    outcome: "submitted",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  store.ownerInstructions.unshift(entry);
  return entry;
}

/**
 * @param {ReturnType<typeof normalizeRevisionStore>} store
 * @param {string} jobId
 * @param {"applied"|"rejected"} outcome
 */
export function resolveOwnerInstruction(store, jobId, outcome) {
  const entry = store.ownerInstructions.find((i) => i.jobId === jobId && i.outcome === "submitted");
  if (!entry) return null;
  entry.outcome = outcome;
  entry.resolvedAt = new Date().toISOString();
  return entry;
}

/** @param {object[]} jobs */
function backfillOwnerInstructionsFromJobs(jobs) {
  /** @type {object[]} */
  const out = [];
  for (const job of [...jobs].reverse()) {
    const text = String(job.instruction || "").trim();
    if (!text) continue;
    out.unshift({
      id: `ins-${String(job.id || "").replace(/^rev-/, "") || Date.now().toString(36)}`,
      slug: job.slug,
      sectionId: job.sectionId,
      text,
      jobId: job.id,
      articleTitle: null,
      outcome:
        job.status === "applied" ? "applied" : job.status === "rejected" ? "rejected" : "submitted",
      createdAt: job.createdAt || new Date().toISOString(),
      resolvedAt: job.appliedAt || job.rejectedAt || null,
    });
  }
  return out;
}

export function createRevisionJob({ article, slug, sectionId, instruction, current, matrix = null }) {
  const now = new Date().toISOString();
  const proposal = buildProposal({ article, sectionId, instruction, current, matrix });
  return {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    slug,
    sectionId,
    instruction: String(instruction || "").trim(),
    status: "proposed",
    createdAt: now,
    updatedAt: now,
    proposal,
  };
}

/** job 作成時に store へ追記（指示は ownerInstructions にも自動保存） */
export function attachRevisionJobToStore(store, job, article) {
  store.jobs.unshift(job);
  recordOwnerInstruction(store, {
    slug: job.slug,
    sectionId: job.sectionId,
    text: job.instruction,
    jobId: job.id,
    articleTitle: article?.title,
  });
  store.generatedAt = new Date().toISOString();
}

export function buildProposal({ article, sectionId, instruction, current, matrix = null }) {
  const hint = String(instruction || "").trim();
  const before = String(current || "");
  const topic = inferTopic(article);
  const canApply = APPLIABLE_SECTIONS.has(sectionId);
  const educationLaw = isEducationLawContext(article, hint, before);
  const keywords = topicKeywords(article, hint);

  if (!hint) {
    return { before, after: before, note: "指示が空です", canApply: false };
  }

  if (sectionId === "nowSummary") {
    if (educationLaw) {
      return {
        before,
        after: numbered([
          "学校教育法等改正の狙いは、紙中心だった正式な教科書に、動画・音声などを含むデジタル形態や紙・デジタル併用型を含めることです。",
          "改正後は、デジタル教科書も検定・採択・義務教育の無償給与の対象になります。ただし、紙の教科書を一律廃止する制度ではありません。",
          "学校現場では、端末運用、教員の準備負担、教科書分量とデジタル教材の役割分担、子どもの負担軽減が今後の論点です。",
        ]),
        note: "教育法改正の指示として解釈し、「提出・賛否」ではなく「何をどう改正するか／現場影響」へ再構成",
        canApply,
      };
    }
    const ownerBullets = parseOwnerInstructionBullets(hint);
    if (ownerBullets.length >= 1) {
      return {
        before,
        after: numbered(ownerBullets),
        note: `オーナー指示の${ownerBullets.length}行をそのまま反映`,
        canApply,
      };
    }
    const after = guardMetaOutput(buildNowSummaryProposal(article, topic, keywords), () =>
      buildNowSummaryProposal(article, topic, keywords, { strict: true }),
    );
    return {
      before,
      after,
      note: "記事データ（答弁抜粋・経緯）から読者向けの結論文を生成",
      canApply,
    };
  }

  if (sectionId === "summaryBullets") {
    if (educationLaw) {
      return {
        before,
        after: bulletLines([
          "改正の中心は、デジタル形態を含む教科書を正式な教科書として扱えるようにする点",
          "動画・音声なども検定・採択・無償給与の対象に入り、教科書会社・教育委員会・学校の運用に影響する",
          "紙の教科書を一律廃止する制度ではなく、紙とデジタルの使い分けが今後の焦点",
          "附帯決議では、教科書分量やデジタル教材との役割分担を検討し、子どもと学校現場の負担軽減を求めている",
        ]),
        note: "根拠ブロックを「何を変えるか」「現場への影響」に分解",
        canApply,
      };
    }
    const after = guardMetaOutput(buildSummaryBulletsProposal(article, topic, keywords), () =>
      buildSummaryBulletsProposal(article, topic, keywords, { strict: true }),
    );
    return {
      before,
      after,
      note: "タイトルに即した事実要点を記事データから再構成（手続きログは除外）",
      canApply,
    };
  }

  if (sectionId === "arcSummary") {
    if (educationLaw) {
      return {
        before,
        after: [
          "2026-04-07 — 学校教育法等改正案が閣議決定。デジタル形態を含む教科書を制度化する方針が示された。",
          "2026-05-29 — 参議院本会議で松本大臣が趣旨説明。紙とデジタル双方の良さを生かす改正だと説明した。",
          "2026-06-10 — 改正法が成立。附帯決議で子どもと学校現場の負担軽減、教材の役割分担検討が求められた。",
        ].join("\n"),
        note: "経緯を提出・賛否の列挙ではなく、制度内容が分かる時系列へ再構成",
        canApply,
      };
    }
    const after = guardMetaOutput(buildArcSummaryProposal(article, before, topic, keywords), () =>
      buildArcSummaryProposal(article, before, topic, keywords, { strict: true }),
    );
    return {
      before,
      after,
      note: "経緯を日付×発言者ごとに1行。答弁内容は要約文（「」）で統合",
      canApply,
    };
  }

  if (sectionId === "title_opening") {
    if (educationLaw) {
      const requested = requestedTitleFromInstruction(hint);
      const title = requested || "学校教育法改正とデジタル教科書";
      return {
        before,
        after: [
          `タイトル: ${title}`,
          "1行目候補: 学校教育法等改正の中心は、動画・音声などを含むデジタル教科書を正式な教科書に位置づけ、検定・採択・義務教育の無償給与の対象にすることです。",
        ].join("\n"),
        note: "教育法改正の狙いに合わせ、タイトルと冒頭1行を「何をどう改正するか」へ修正",
        canApply,
      };
    }
    const opening = pickOpeningLine(article, topic, keywords);
    return {
      before,
      after: [`タイトル: ${article?.title || topic}`, `1行目候補: ${opening}`].join("\n"),
      note: "タイトルに対応する冒頭1文を記事データから生成",
      canApply,
    };
  }

  if (sectionId === "timeline") {
    const sanitized = sanitizeTimelineArticle(article);
    let lines = formatTimelineReviseText(sanitized).split("\n").filter(Boolean);
    if (/並んで|混ぜ|交互/.test(hint)) {
      lines = interleaveTimeline(lines);
    }
    const after = lines.join("\n");
    const lint = lintArticle(sanitized);
    return {
      before,
      after,
      note: lint.ok
        ? "editorial-rules.json 適用済み（議事録生文の平易語化・話題外X除外）"
        : `editorial-rules 自動修正後も blocker ${lint.blockers.length} 件`,
      canApply,
      unchanged: before === after,
    };
  }

  if (sectionId === "stance") {
    const result = buildStanceProposalText(matrix, hint, before);
    return { ...result, unchanged: result.before === result.after };
  }

  if (sectionId === "xPosts") {
    const after = formatXPostsReviseText(article);
    return {
      before,
      after,
      note: after === before ? "X投稿データなし、または変更なし" : "X投稿を話題一致・平易語で整形",
      canApply: after !== before,
      unchanged: before === after,
    };
  }

  if (sectionId === "glossary") {
    const after = formatGlossaryReviseText(article, hint);
    return {
      before,
      after,
      note: "用語解説を2語以上・平易語で整形",
      canApply: after !== before,
      unchanged: before === after,
    };
  }

  if (sectionId === "prosCons") {
    const after = formatProsConsReviseText(article);
    return {
      before,
      after,
      note: after === before ? "メリデメデータなし" : "メリデメを公表数値付きで整形",
      canApply: after !== before,
      unchanged: before === after,
    };
  }

  if (sectionId === "impact") {
    const result = buildImpactProposalText(article, before);
    return { ...result, unchanged: result.before === result.after };
  }

  if (sectionId === "statsSeries") {
    const result = buildStatsProposalText(article, before);
    return { ...result, unchanged: result.before === result.after };
  }

  return {
    before,
    after: before,
    note: "このブロックは未対応です",
    canApply: false,
    unchanged: true,
  };
}

export function applyProposalToArticle(article, sectionId, after) {
  const next = JSON.parse(JSON.stringify(article));
  const text = String(after || "");
  if (sectionId === "nowSummary") {
    const bullets = parseTextItems(text).slice(0, 3);
    if (bullets.length < 1) throw new Error("nowSummary の提案が空です");
    next.nowSummary = {
      ...(next.nowSummary || {}),
      label: next.nowSummary?.label || "いまの結論（AI・平易語）",
      bullets,
      updatedAt: new Date().toISOString(),
    };
  } else if (sectionId === "summaryBullets") {
    const bullets = parseTextItems(text);
    if (bullets.length < 1) throw new Error("要点の提案が空です");
    next.summaryBullets = bullets;
  } else if (sectionId === "arcSummary") {
    const rows = parseArc(text);
    if (rows.length < 1) throw new Error("経緯は `YYYY-MM-DD — 内容` の形式が必要です");
    next.arcSummary = rows;
  } else if (sectionId === "title_opening") {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = stripLabel(lines.find((l) => /^タイトル[:：]/.test(l)) || "", "タイトル");
    const opening = stripLabel(lines.find((l) => /^1行目候補[:：]|^冒頭[:：]/.test(l)) || "", "1行目候補");
    if (title) next.title = title;
    if (opening) {
      const prev = Array.isArray(next.summaryBullets) ? next.summaryBullets : [];
      next.summaryBullets = [opening, ...prev.slice(1)];
    }
    if (!title && !opening) throw new Error("タイトルまたは1行目候補が必要です");
  } else if (sectionId === "timeline") {
    const rows = parseTimelineApplyRows(text);
    if (rows.length < 1) throw new Error("タイムラインの提案が空です");
    const timeline = [...(next.timeline || [])];
    const used = new Set();
    let matched = 0;
    for (const row of rows) {
      const idx = findTimelineIndex(timeline, row, used);
      if (idx < 0) continue;
      used.add(idx);
      timeline[idx] = { ...timeline[idx], summaryPlain: row.summaryPlain };
      matched++;
    }
    if (matched < 1) throw new Error("タイムラインの行を記事データにマッチできませんでした");
    next.timeline = timeline;
  } else if (sectionId === "xPosts") {
    throw new Error("xPosts は記事JSONへの直接保存は未対応（次フェーズ）");
  } else if (sectionId === "glossary") {
    const terms = parseGlossaryApplyText(text);
    if (terms.length < 1) throw new Error("用語解説の提案が空です");
    next.glossary = terms;
  } else if (sectionId === "prosCons") {
    const pc = parseProsConsApplyText(text);
    if (!pc.merits.length && !pc.demerits.length) throw new Error("メリデメの提案が空です");
    next.prosCons = {
      ...(next.prosCons || {}),
      merits: pc.merits,
      demerits: pc.demerits,
    };
  } else if (sectionId === "impact") {
    const impact = parseImpactApplyText(text);
    if (!impact) throw new Error("利害整理の形式が不正です");
    next.meritsDemerits = {
      disclaimer: impact.disclaimer || next.meritsDemerits?.disclaimer || "",
      merits: impact.merits,
      demerits: impact.demerits,
    };
  } else if (sectionId === "statsSeries") {
    const stats = parseStatsApplyText(text);
    if (!stats) throw new Error("数値統計はポイント2点以上が必要です");
    next.statsSeries = stats;
  } else if (sectionId === "stance") {
    throw new Error("stance は policy-matrix JSON へ別途保存します");
  } else {
    throw new Error("このブロックはまだ保存未対応です");
  }

  return finalizeRevisionArticle(next);
}

function formatXPostsReviseText(article) {
  const posts = article?.xPosts ?? [];
  if (!posts.length) return "(X投稿なし)";
  return posts
    .map((p, i) => {
      const author = p.author || p.xPost?.account_label || "?";
      const body = shortenSentence((p.text || p.xPost?.text || "").replace(/\s+/g, " "), 100);
      return `${i + 1}. ${author} — ${body || "（本文なし）"}`;
    })
    .join("\n");
}

function formatGlossaryReviseText(article, hint) {
  const existing = (article?.glossary ?? []).map((g) => `${g.term}: ${g.definition}`);
  if (existing.length >= 2) return existing.join("\n");
  const kw = String(article?.searchKeyword || article?.title || "").trim();
  const fallback = kw
    ? [`${kw}: ${kw}に関する制度・論点（平易語で定義）`, "国会: 法律を制定し、政府の施策を審議する場"]
    : ["{用語1}: {定義}", "{用語2}: {定義}"];
  return [...existing, ...fallback].slice(0, Math.max(2, existing.length)).join("\n");
}

function formatProsConsReviseText(article) {
  const merits = [
    ...(article?.prosCons?.merits ?? []),
    ...(article?.meritsDemerits?.merits ?? []),
  ];
  const demerits = [
    ...(article?.prosCons?.demerits ?? []),
    ...(article?.meritsDemerits?.demerits ?? []),
  ];
  const m = merits.map((x) => `＋ ${x.point || x.text || x.headline || "—"}（${x.figure || x.sourceDate || "—"}）`);
  const d = demerits.map((x) => `− ${x.point || x.text || x.headline || "—"}（${x.figure || x.sourceDate || "—"}）`);
  return [...m, ...d].join("\n") || "(メリデメなし)";
}

function parseGlossaryApplyText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      return m ? { term: m[1].trim(), definition: m[2].trim() } : null;
    })
    .filter(Boolean);
}

function parseProsConsApplyText(text) {
  /** @type {{ point: string, figure: string, text?: string, sourceUrl?: string }[]} */
  const merits = [];
  /** @type {{ point: string, figure: string, text?: string, sourceUrl?: string }[]} */
  const demerits = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    const m = t.match(/^[＋+]\s*(.+?)（([^）]+)）$/);
    const d = t.match(/^[−\-]\s*(.+?)（([^）]+)）$/);
    if (m) merits.push({ point: m[1].trim(), figure: m[2].trim(), text: m[1].trim() });
    if (d) demerits.push({ point: d[1].trim(), figure: d[2].trim(), text: d[1].trim() });
  }
  return { merits, demerits };
}

/** 管理画面保存 — 全セクション共通でサニタイズ＋lint */
function finalizeRevisionArticle(article) {
  const next = sanitizeTimelineArticle(article);
  const lint = lintArticle(next);
  if (!lint.ok) {
    const detail = lint.blockers
      .map((b) => `${b.ruleId} ${b.field}: ${b.line}`)
      .join(" | ");
    throw new Error(`編集ルール違反のため保存できません: ${detail}`);
  }
  return next;
}

function inferTopic(article) {
  const raw = article?.title || article?.searchKeyword || article?.slug || "この案件";
  return String(raw).replace(/[｜|].*$/, "").replace(/の動向$/, "").trim() || "この案件";
}

function isEducationLawContext(article, hint, current) {
  const text = [article?.title, article?.searchKeyword, hint, current].filter(Boolean).join(" ");
  return /学校教育法|教育法改正|デジタル教科書|教科書|学校現場/.test(text);
}

function requestedTitleFromInstruction(hint) {
  const text = String(hint || "").trim();
  const q = text.match(/([^。\n]{2,40}？)/);
  if (q) return normalizeEducationTitle(q[1]);
  if (/狙い|意図|目的/.test(text)) return "学校教育法改正の狙いは？";
  if (/学校現場|影響/.test(text)) return "学校教育法改正、学校現場への影響";
  return "";
}

function normalizeEducationTitle(title) {
  return String(title || "")
    .replace(/^教育法改正/, "学校教育法改正")
    .replace(/^デジタル教科書改正/, "学校教育法改正")
    .trim();
}

function numbered(items) {
  return items.map((x, i) => `${i + 1}. ${x}`).join("\n");
}

function bulletLines(items) {
  return items.map((x) => `・${x}`).join("\n");
}

function parseTextItems(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^[・\-*]\s*/, "").replace(/^\d+[.)．、]\s*/, ""))
    .filter(Boolean);
}

function parseArc(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d{4}-\d{2}-\d{2})\s*(?:—|-|：|:)\s*(.+)$/);
      return m ? { date: m[1], text: m[2].trim() } : null;
    })
    .filter(Boolean);
}

function tightenArcText(text, topic) {
  const t = String(text || "").replace(/国会で答弁・質疑した。?$/, "国会で論点化。");
  if (/答弁|質疑|閲覧/.test(t) && !/確認|論点|未確定|検討/.test(t)) {
    return `${topic}について国会で確認・質疑。`;
  }
  return t;
}

function interleaveTimeline(lines) {
  const x = lines.filter((l) => /\[X\]|\[x_post\]/i.test(l));
  const diet = lines.filter((l) => !/\[X\]|\[x_post\]/i.test(l));
  const out = [];
  const max = Math.max(x.length, diet.length);
  for (let i = 0; i < max; i++) {
    if (diet[i]) out.push(diet[i]);
    if (x[i]) out.push(x[i]);
  }
  return out.length ? out : lines;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stripLabel(line, label) {
  return line.replace(new RegExp(`^${label}[:：]\\s*`), "").trim();
}

const META_INSTRUCTION_RE =
  /を先に整理|を短く要約|として分ける|列挙ではなく|読者にとって|この記事では|整理します|要約する|論点として分|確認できた事実を|書き方|書き方の|方針として/;

const PROCEDURAL_NOISE_RE =
  /両件は承諾|起立を求め|法制化・法案審議の継続|関連法案が可決|特別委員会で関連|閲覧を求め|採決|可決・成立/;

const RAW_DIET_DUMP_RE =
  /○[^\r\n（]+（[^）]+君）|御質問にお答え|御答弁申し上げ|塩川委員におかれましては/;

const GENERIC_SPEECH_RE = /が.+?(について|を)国会で(答弁・質疑|論じ)/;

function isRawDietDump(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  if (RAW_DIET_DUMP_RE.test(t)) return true;
  if (t.length > 110 && !/「[^」]{8,}」/.test(t)) return true;
  return false;
}

function topicKeywords(article, hint) {
  const parts = [
    article?.title,
    article?.searchKeyword,
    ...(Array.isArray(article?.searchKeywords) ? article.searchKeywords : []),
    article?.slug,
    ...(Array.isArray(article?.tags) ? article.tags : []),
    hint,
  ]
    .filter(Boolean)
    .join(" ");
  const found = parts.match(/[\u3040-\u9fff]{2,8}/g) || [];
  const uniq = [...new Set(found)].filter((w) => !/動向|国会|法案|審議|法制化|表明|論点|整理|記事/.test(w));
  if (article?.searchKeyword) uniq.unshift(String(article.searchKeyword));
  return uniq.slice(0, 8);
}

function isMetaInstruction(text) {
  return META_INSTRUCTION_RE.test(String(text || ""));
}

function isProceduralNoise(text) {
  return PROCEDURAL_NOISE_RE.test(String(text || ""));
}

function isGenericSpeechSummary(text) {
  return GENERIC_SPEECH_RE.test(String(text || ""));
}

function isTopicRelevant(text, keywords) {
  const t = String(text || "");
  if (!t) return false;
  if (keywords.some((k) => t.includes(k))) return true;
  return keywords.length === 0;
}

function guardMetaOutput(after, fallbackFn) {
  const lines = parseTextItems(after);
  if (lines.some(isMetaInstruction)) return fallbackFn();
  return after;
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/[。\n]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 16);
}

function scoreSentence(sentence, keywords) {
  let score = 0;
  if (/\d+[\.．]?\d*\s*[％%]/.test(sentence)) score += 4;
  if (/[五\d][・．.]?\d?\s*[％%]/.test(sentence)) score += 4;
  if (keywords.some((k) => sentence.includes(k))) score += 2;
  if (/政府|内閣|大臣|総理|政労使|法案|成立|可決|改定|率|実質/.test(sentence)) score += 1;
  if (isProceduralNoise(sentence)) score -= 6;
  if (isGenericSpeechSummary(sentence)) score -= 4;
  if (isMetaInstruction(sentence)) score -= 8;
  return score;
}

function shortenSentence(text, max = 96) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizePercentText(text) {
  return String(text || "")
    .replace(/五・〇九[％%]/g, "5.09%")
    .replace(/五％台/g, "5%台");
}

function parseDateFromBullet(line) {
  const m = String(line || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function parseSpeakerFromBullet(line) {
  const m = String(line || "").match(/^\d{4}-\d{2}-\d{2}[：:]\s*([^が—\-：:\n]{1,16})/);
  return m ? m[1].trim() : "";
}

function parseSpeakerFromArc(text) {
  const m = String(text || "").match(/^(.+?)が/);
  return m ? m[1].trim() : "";
}

function collectMaterial(article, keywords, { strict = false } = {}) {
  /** @type {{ date: string, speaker: string, text: string, score: number }[]} */
  const items = [];
  const seen = new Set();

  function add(date, speaker, text, score = 1) {
    const t = toPlainTone(normalizePercentText(shortenSentence(cleanFact(text), 110)));
    if (!t || isMetaInstruction(t)) return;
    if (strict && (isProceduralNoise(t) || isGenericSpeechSummary(t))) return;
    if (!strict && isProceduralNoise(t)) return;
    if (!isTopicRelevant(t, keywords) && !keywords.some((k) => `${speaker}${date}`.includes(k))) return;
    const key = `${date}|${speaker}|${t.slice(0, 48)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ date: date || today(), speaker: speaker || "", text: t, score });
  }

  for (const fact of extractStructuredFacts(article)) add(fact.date, fact.speaker, fact.text, fact.score);

  const ps = article?.primarySpeech;
  if (ps) {
    const corpus = [ps.excerpt, ps.speechFull?.slice(0, 2500)].filter(Boolean).join(" ");
    for (const s of splitSentences(corpus)) {
      const sc = scoreSentence(s, keywords);
      if (sc >= 2) add(ps.date, ps.speaker, s, sc);
    }
  }

  for (const row of article?.arcSummary || []) {
    if (isGenericSpeechSummary(row.text) || isProceduralNoise(row.text)) continue;
    add(row.date, parseSpeakerFromArc(row.text), row.text, 2);
  }

  for (const b of article?.nowSummary?.bullets || []) {
    if (isProceduralNoise(b) || isGenericSpeechSummary(b)) continue;
    if (/^Title:\s*/i.test(b) || /出典\s*\d+\s*件|時点の公開情報/.test(b)) continue;
    const speaker = parseSpeakerFromBullet(b);
    const body = b.replace(/^\d{4}-\d{2}-\d{2}[：:]\s*/, "").replace(/^[^が]+が/, "").trim();
    if (!body || isGenericSpeechSummary(body)) continue;
    add(parseDateFromBullet(b), speaker, body, 1);
  }

  for (const ev of article?.timeline || []) {
    if (ev.type === "x_post" && ev.summaryPlain) {
      add(ev.date, ev.xPost?.account_label || "X", shortenSentence(ev.summaryPlain, 90), 2);
      continue;
    }
    if (ev.type !== "speech") continue;
    const sp = ev.speech?.speaker || "";
    const sum = ev.summaryPlain || "";
    if (isGenericSpeechSummary(sum)) continue;
    add(ev.date, sp, sum, 1);
  }

  for (const m of article?.prosCons?.merits || []) {
    const t = m.text || m.headline || "";
    if (/読者の判断|判断材料/.test(t)) continue;
    if (!isProceduralNoise(t) && isTopicRelevant(t, keywords)) add(m.sourceDate, "", t, 3);
  }

  for (const m of article?.meritsDemerits?.merits || []) {
    const t = m.text || m.headline || "";
    if (!isProceduralNoise(t) && isTopicRelevant(t, keywords)) add(m.sourceDate, "", t, 4);
  }

  for (const d of article?.meritsDemerits?.demerits || []) {
    const t = d.text || d.headline || "";
    if (isTopicRelevant(t, keywords)) add(d.sourceDate, "", t, 2);
  }

  for (const d of article?.prosCons?.demerits || []) {
    const t = d.text || d.headline || "";
    if (isTopicRelevant(t, keywords)) add(d.sourceDate, "", t, 1);
  }

  const plain = String(article?.plainExplanation || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !/ここでの整理|解釈を含み|正本は/.test(l));
  for (const p of plain) {
    if (!isGenericSpeechSummary(p) && scoreSentence(p, keywords) >= 1) add("", "", p, 1);
  }

  return items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.date || "").localeCompare(a.date || "");
  });
}

function cleanFact(text) {
  return String(text || "")
    .replace(/^Title:\s*/i, "")
    .replace(/（国会議事録）\.?$/g, "")
    .replace(/国会で答弁・質疑した\.?$/g, "")
    .replace(/国会で答弁・質疑を行った\.?$/g, "")
    .trim();
}

/** オーナーが「この2点でいい」等と指示した行を抽出 */
function parseOwnerInstructionBullets(hint) {
  const raw = String(hint || "").trim();
  if (!raw) return [];
  const countMatch = raw.match(/この\s*(\d+)\s*点/);
  const maxItems = countMatch ? Math.min(3, parseInt(countMatch[1], 10)) : 3;
  const skipRe = /^(この|それ|以下|上記|例[:：]|修正指示)/;
  /** @type {string[]} */
  const bullets = [];

  for (const line of raw.split("\n")) {
    let t = line.trim();
    if (!t || skipRe.test(t)) continue;
    t = t.replace(/^(?:\d+[.)．、]\s*)/, "").trim();
    if (/^Title:\s*/i.test(t)) continue;
    if (t.length < 12) continue;
    if (/時点の公開情報|出典\s*\d+\s*件/.test(t)) continue;
    if (!t.endsWith("。")) t += "。";
    if (!bullets.includes(t)) bullets.push(t);
    if (bullets.length >= maxItems) break;
  }
  return bullets;
}

function formatSummaryBullet({ date, speaker, text }) {
  const body = cleanFact(text);
  const sp = speaker ? `${speaker}— ` : "";
  return `${date}：${sp}${body}（国会議事録）`;
}

function buildSummaryBulletsProposal(article, topic, keywords, opts = {}) {
  const material = collectMaterial(article, keywords, opts);
  const picked = [];
  const perSpeaker = new Map();

  for (const m of material) {
    const key = `${m.date}|${m.speaker}`;
    const count = perSpeaker.get(key) || 0;
    if (count >= 2) continue;
    perSpeaker.set(key, count + 1);
    picked.push(m);
    if (picked.length >= 5) break;
  }

  let bullets = picked.map((m) => formatSummaryBullet(m));

  if (bullets.length < 2 && article?.primarySpeech?.excerpt) {
    const ps = article.primarySpeech;
    bullets = [
      formatSummaryBullet({
        date: ps.date,
        speaker: ps.speaker,
        text: shortenSentence(ps.excerpt, 100),
      }),
    ];
  }

  if (bullets.length < 1) {
    bullets = [`${today()}：${topic}に関する国会動向（一次ソース要確認）（国会議事録）`];
  }

  return bulletLines(bullets);
}

function buildNowSummaryProposal(article, topic, keywords, opts = {}) {
  const material = collectMaterial(article, keywords, opts);
  const lines = [];

  for (const m of material) {
    if (isGenericSpeechSummary(m.text)) continue;
    const line = cleanFact(m.text);
    if (!lines.includes(line)) lines.push(line);
    if (lines.length >= 3) break;
  }

  if (/最低賃金/.test(topic) && !lines.some((l) => /最低賃金/.test(l))) {
    if (lines.length >= 2) lines[1] = `${lines[1]}。最低賃金の改定額は未確定。`;
    else lines.push("最低賃金の改定額は未確定。");
  }

  while (lines.length < 3 && material.length > lines.length) {
    const next = cleanFact(material[lines.length]?.text || "");
    if (next && !lines.includes(next)) lines.push(next);
    else break;
  }

  return numbered(lines.slice(0, 3));
}

function buildArcSummaryProposal(article, before, topic, keywords, opts = {}) {
  const events = collectArcEvents(article, topic, keywords);
  /** @type {Set<string>} */
  const mustKeep = new Set(
    (article?.arcSummary || []).map((r) => `${r.date}|${parseSpeakerFromArc(r.text)}`),
  );
  if (article?.primarySpeech?.date && article?.primarySpeech?.speaker) {
    mustKeep.add(`${article.primarySpeech.date}|${article.primarySpeech.speaker}`);
  }

  /** @type {typeof events} */
  const kept = [];
  /** @type {typeof events} */
  const optional = [];
  for (const ev of events) {
    const key = `${ev.date}|${ev.speaker}`;
    if (mustKeep.has(key) || ev.score >= 10) kept.push(ev);
    else optional.push(ev);
  }

  const merged = [...kept];
  for (const ev of optional) {
    if (merged.length >= 8) break;
    const key = `${ev.date}|${ev.speaker}`;
    if (!merged.some((m) => `${m.date}|${m.speaker}` === key)) merged.push(ev);
  }

  merged.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const rows = merged.map((ev) => formatArcRow(ev)).filter(Boolean);
  if (rows.length >= 1) return rows.join("\n");

  const fallback = parseArc(before)
    .filter((r) => !isProceduralNoise(r.text))
    .map((r) => {
      const speaker = parseSpeakerFromArc(r.text);
      return formatArcRow({
        date: r.date,
        speaker,
        topic,
        summary: isGenericSpeechSummary(r.text) ? "" : cleanFact(r.text),
        meeting: "",
        role: "質疑",
      });
    });
  if (fallback.length) return fallback.join("\n");

  return `${today()} — ${topic}について国会で確認された主要論点を整理中。`;
}

/** 経緯用 — 日付×発言者ごとに1行。同一答弁の切り出し分割はしない */
function collectArcEvents(article, topic, keywords) {
  /** @type {Map<string, { date: string, speaker: string, topic: string, summary: string, meeting: string, role: string, score: number }>} */
  const byKey = new Map();
  const subject = arcSubject(topic, keywords);

  function upsert(ev) {
    const date = ev.date || "";
    const speaker = ev.speaker || "";
    if (!date || !speaker) return;
    const key = `${date}|${speaker}`;
    const prev = byKey.get(key);
    if (!prev || ev.score > prev.score || (ev.summary && !prev.summary)) {
      byKey.set(key, { ...ev, date, speaker, topic: ev.topic || subject });
    }
  }

  const ps = article?.primarySpeech;
  if (ps?.date && ps?.speaker) {
    upsert({
      date: ps.date,
      speaker: ps.speaker,
      topic: subject,
      summary: summarizeSpeechForArc(ps),
      meeting: ps.nameOfMeeting || "",
      role: inferSpeechRole(ps.speaker, ps.speakerPosition, ps.nameOfMeeting),
      score: 10,
    });
  }

  for (const row of article?.arcSummary || []) {
    const speaker = parseSpeakerFromArc(row.text) || "";
    if (!row.date || !speaker) continue;
    if (ps && ps.date === row.date && ps.speaker === speaker) continue;
    upsert({
      date: row.date,
      speaker,
      topic: subject,
      summary: isGenericSpeechSummary(row.text) ? "" : cleanFact(row.text),
      meeting: "",
      role: "質疑",
      score: 2,
    });
  }

  for (const ev of article?.timeline || []) {
    if (ev.type !== "speech" || !ev.speech) continue;
    const sp = ev.speech;
    const date = ev.date || sp.date || "";
    const speaker = sp.speaker || "";
    if (!date || !speaker) continue;
    if (ps && ps.date === date && ps.speaker === speaker) continue;

    const sum = ev.summaryPlain || "";
    upsert({
      date,
      speaker,
      topic: subject,
      summary: isGenericSpeechSummary(sum) ? summarizeGenericSpeech(sp, subject) : cleanFact(sum),
      meeting: sp.nameOfMeeting || "",
      role: inferSpeechRole(speaker, "", sp.nameOfMeeting),
      score: isGenericSpeechSummary(sum) ? 1 : 3,
    });
  }

  return [...byKey.values()].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

function arcSubject(topic, keywords) {
  const kw = keywords.find((k) => k && k.length >= 2);
  return kw || String(topic || "本件").split(/[・｜|]/)[0];
}

function inferSpeechRole(speaker, position, meeting) {
  const ctx = `${speaker}${position || ""}${meeting || ""}`;
  if (/大臣|国務|内閣|副大臣|官房長|長官/.test(ctx)) return "答弁";
  return "質疑";
}

function summarizeSpeechForArc(ps) {
  const raw = normalizePercentText([ps.excerpt, ps.speechFull?.slice(0, 2800)].filter(Boolean).join(" "));
  /** @type {string[]} */
  const parts = [];

  if (/5\.09%|5%台|賃上げ率/.test(raw)) {
    parts.push("春闘の連合集計で賃上げ率5.09%、三年連続5%台の水準");
  }
  if (/政労使/.test(raw) && /意見交換/.test(raw)) {
    parts.push("3/23の政労使意見交換で、物価上昇を上回る継続的な賃上げ実現を要請");
  }
  if (/中小企業|小規模事業者/.test(raw) && /波及/.test(raw)) {
    parts.push("大企業だけでなく地方の中小・小規模事業者への賃上げ波及が課題");
  }
  if (/実質賃金/.test(raw) && /プラス/.test(raw)) {
    parts.push("実質賃金は所定内給与の増加等を背景に、最近は前年同月比プラスで推移");
  }
  if (/中東|エネルギー|原油/.test(raw)) {
    parts.push("原油高などを踏まえ、物価・実質賃金への影響を注視");
  }

  if (parts.length >= 2) return `${parts.join("。")}。`;
  if (parts.length === 1) return `${parts[0]}。`;

  const fallback = toPlainTone(shortenSentence(cleanFact(ps.excerpt || ""), 100));
  return fallback || "国会で本件に関する政府見解を表明。";
}

function summarizeGenericSpeech(speech, subject) {
  const meeting = speech?.nameOfMeeting || "";
  const house = speech?.nameOfHouse || "";
  const place = [house, meeting].filter(Boolean).join("・");
  if (place) return `${place}で${subject}に関する論点を質疑。`;
  return `${subject}に関する質疑を実施。`;
}

function formatArcRow({ date, speaker, topic, summary, meeting, role }) {
  const subj = topic || "本件";
  const act = role === "答弁" ? "答弁" : "質疑";
  const meet = meeting ? `（${meeting}）` : "";
  const head = `${date} — ${speaker}が${subj}について以下のように${act}${meet}`;
  const body = toPlainTone(String(summary || "").trim());
  if (!body) return `${head}。（要約は議事録参照）`;
  return `${head}。「${body.replace(/^「|」$/g, "")}」`;
}

function parseTimelineLine(line) {
  const m = String(line || "").trim().match(/^(\d{4}-\d{2}-\d{2})\s*\[([^\]]+)\]\s*(.+)$/);
  return m ? { date: m[1], kind: m[2], text: m[3].trim() } : null;
}

function parseTimelineApplyRows(text) {
  return String(text || "")
    .split("\n")
    .map((line) => parseTimelineLine(line))
    .filter(Boolean)
    .map((row) => ({ date: row.date, kind: row.kind, summaryPlain: row.text }));
}

function timelineKindToType(kind) {
  if (kind === "国会" || kind === "speech") return "speech";
  if (kind === "x_post" || kind === "X" || kind === "x") return "x_post";
  return kind;
}

function findTimelineIndex(timeline, row, used) {
  const type = timelineKindToType(row.kind);
  const speaker = parseSpeakerFromTimelineBody(row.summaryPlain) || parseSpeakerFromArc(row.summaryPlain);
  return timeline.findIndex((ev, idx) => {
    if (used.has(idx)) return false;
    const evDate = ev.date || ev.speech?.date || "";
    const evType = ev.type || "";
    if (evDate !== row.date || evType !== type) return false;
    if (speaker && ev.speech?.speaker) return ev.speech.speaker === speaker;
    return true;
  });
}

function buildTimelineProposal(article, before, hint, topic, keywords) {
  const subject = arcSubject(topic, keywords);
  const wantsSpecific = wantsTimelineSpecificity(hint);
  const questionTopics = collectQuestionTopics(article, subject);
  /** @type {Map<string, object>} */
  const evByKey = new Map();
  for (const ev of article?.timeline || []) {
    const date = ev.date || ev.speech?.date || "";
    const speaker = ev.speech?.speaker || "";
    if (date && speaker) evByKey.set(`${date}|${speaker}`, ev);
  }

  let dietIndex = 0;
  const lines = before.split("\n").filter(Boolean);
  return lines
    .map((line) => {
      const row = parseTimelineLine(line);
      if (!row) return line;

      const isDiet = row.kind === "国会" || row.kind === "speech";
      const isX = row.kind === "X" || row.kind === "x_post";
      const offTopicX =
        isX && !keywords.some((k) => row.text.includes(k)) && !/賃上げ|最低賃金|時給/.test(row.text);

      if (offTopicX) return null;

      if (
        isDiet &&
        (wantsSpecific ||
          isGenericSpeechSummary(row.text) ||
          isRawDietDump(row.text) ||
          /論じ|質問した/.test(row.text))
      ) {
        const speaker = parseSpeakerFromArc(row.text) || parseSpeakerFromTimelineBody(row.text) || "";
        const ev = evByKey.get(`${row.date}|${speaker}`);
        return rewriteTimelineSpeechRow({
          date: row.date,
          speaker,
          subject,
          ev,
          article,
          topicIndex: dietIndex++,
          questionTopics,
        });
      }

      if (isDiet && isRawDietDump(row.text)) {
        const speaker = parseSpeakerFromTimelineBody(row.text) || "";
        const ev = evByKey.get(`${row.date}|${speaker}`);
        return rewriteTimelineSpeechRow({
          date: row.date,
          speaker,
          subject,
          ev,
          article,
          topicIndex: dietIndex++,
          questionTopics,
        });
      }

      if ((row.kind === "X" || row.kind === "x_post") && row.text.length > 140) {
        const gist = extractXPostGist(row.text, subject);
        return `${row.date} [${row.kind}] ${gist}`;
      }

      return line;
    })
    .filter(Boolean)
    .join("\n");
}

function wantsTimelineSpecificity(hint) {
  return /一般人|分かる|わかり|論じ|曖昧|平易|具体|何を|漠然|聞いた|どういう|質問した|ばか/.test(hint);
}

function parseSpeakerFromTimelineBody(text) {
  const m = String(text || "").match(/^(.+?)—/);
  if (m) return m[1].trim();
  const m2 = String(text || "").match(/^(.+?)が/);
  return m2 ? m2[1].trim() : "";
}

function collectQuestionTopics(article, subject) {
  /** @type {string[]} */
  const topics = [];
  const ps = article?.primarySpeech;
  const raw = normalizePercentText([ps?.excerpt, ps?.speechFull?.slice(0, 3000)].filter(Boolean).join(" "));

  if (/5\.09%|5%台|賃上げ率/.test(raw)) topics.push("春闘の賃上げ率5%台は続くのか");
  if (/政労使|意見交換/.test(raw)) topics.push("政労使意見交換後、物価上昇を上回る賃上げは実現するのか");
  if (/中小|小規模/.test(raw)) topics.push("地方の中小・小規模事業者への賃上げ波及はどう進むのか");
  if (/実質賃金/.test(raw)) topics.push("実質賃金のプラス推移は続くのか");
  if (/物価|エネルギー|原油/.test(raw)) topics.push("物価・エネルギー高を踏まえ、賃上げは続けられるのか");
  if (/最低賃金/.test(subject + raw)) topics.push("2026年度の最低賃金改定額はいつ・いくらになるのか");
  if (/最低賃金/.test(subject + raw)) topics.push("特定最低賃金と地域別最低賃金の役割分担は");

  topics.push(
    "政府の賃上げ支援策は現場に届いているのか",
    "賃上げが家計・地域経済に与える効果はどう見るか",
    "大企業と中小の賃上げ格差は縮まるのか",
  );
  return [...new Set(topics.filter(Boolean))];
}

function questionForMeeting(meeting, subject) {
  if (/決算行政監視/.test(meeting)) return `${subject}と決算・物価対策の整合は`;
  if (/財政金融/.test(meeting)) return `${subject}と金融情勢・景気見通しの関係は`;
  if (/行政監視/.test(meeting)) return `${subject}の政府実行計画の進捗は`;
  if (/内閣/.test(meeting)) return `${subject}の最新データと政府の認識は`;
  if (/文部科学/.test(meeting)) return `${subject}と教育・人材政策の関係は`;
  return null;
}

function extractXPostGist(text, subject) {
  const t = String(text || "").replace(/\s+/g, " ");
  if (/投資と賃上げの好循環/.test(t)) return "高市首相— 成長戦略会議で「投資と賃上げの好循環」を掲げ、賃上げ加速を表明。";
  if (subject && t.includes(subject)) return shortenSentence(t, 100);
  return shortenSentence(t, 100);
}

function rewriteTimelineSpeechRow({ date, speaker, subject, ev, article, topicIndex, questionTopics }) {
  const speech = ev?.speech;
  const meeting = speech?.nameOfMeeting || "";
  const house = speech?.nameOfHouse || "";
  const place = [house, meeting].filter(Boolean).join("・");
  const role = inferSpeechRole(speaker, speech?.speakerPosition || "", meeting);
  const act = role === "答弁" ? "答弁" : "質問";
  const where = place ? `${place}で` : "国会で";

  const sum = ev?.summaryPlain || "";
  if (
    sum &&
    !isGenericSpeechSummary(sum) &&
    !isRawDietDump(sum) &&
    !/質問した[。]?$/.test(sum) &&
    sum.length > 20 &&
    sum.length <= 110
  ) {
    return `${date} [国会] ${speaker}— ${where}「${cleanFact(sum)}」と${act}。`;
  }

  const ps = article?.primarySpeech;
  if (ps && ps.speaker === speaker && ps.date === date) {
    const summary = shortenSentence(summarizeSpeechForArc(ps).replace(/^「|」$/g, ""), 90);
    return `${date} [国会] ${speaker}— ${where}「${summary}」と${act}。`;
  }

  const meetingQ = questionForMeeting(meeting, subject);
  const q = questionTopics[topicIndex % questionTopics.length] || meetingQ || `${subject}の政府方針は`;
  return `${date} [国会] ${speaker}— ${where}「${q}」と${act}。`;
}

function pickOpeningLine(article, topic, keywords) {
  const material = collectMaterial(article, keywords);
  const best = material.find((m) => !isGenericSpeechSummary(m.text) && m.score >= 5);
  if (best) return cleanFact(best.text);
  if (material[0]) return cleanFact(material[0].text);
  return `${topic}の最新動向を、国会答弁と公表資料から整理する。`;
}

function toPlainTone(text) {
  return String(text || "")
    .replace(/しております/g, "している")
    .replace(/ございます/g, "ある")
    .replace(/おりまして/g, "いて")
    .replace(/であります/g, "である")
    .replace(/でございます/g, "である")
    .replace(/御協力をお願いしたところであります/g, "協力を要請した")
    .replace(/と承知しております/g, "と見ている")
    .replace(/と認識しております/g, "としている")
    .replace(/所存でございます/g, "予定である")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStructuredFacts(article) {
  const ps = article?.primarySpeech;
  if (!ps) return [];
  const raw = normalizePercentText([ps.excerpt, ps.speechFull?.slice(0, 2000)].filter(Boolean).join(" "));
  /** @type {{ date: string, speaker: string, text: string, score: number }[]} */
  const facts = [];
  const date = ps.date || "";
  const speaker = ps.speaker || "";

  if (/5\.09%|5%台|賃上げ率/.test(raw)) {
    facts.push({
      date,
      speaker,
      text: "春闘の連合集計で賃上げ率5.09%、三年連続5%台の水準",
      score: 10,
    });
  }
  if (/政労使/.test(raw) && /意見交換/.test(raw)) {
    facts.push({
      date,
      speaker,
      text: "3/23に高市内閣で政労使意見交換を開き、物価上昇を上回る賃上げ実現を要請",
      score: 9,
    });
  }
  if (/中小企業/.test(raw) && /波及/.test(raw)) {
    facts.push({
      date,
      speaker,
      text: "賃上げの勢いを地方の中小企業・小規模事業者へ波及させることが重要",
      score: 8,
    });
  }
  if (/実質賃金/.test(raw) && /プラス/.test(raw)) {
    facts.push({
      date,
      speaker,
      text: "実質賃金は所定内給与の増加等を背景に、最近は前年同月比プラスで推移",
      score: 7,
    });
  }
  return facts;
}
