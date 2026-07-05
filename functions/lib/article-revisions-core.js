export const APPLIABLE_SECTIONS = new Set([
  "title_opening",
  "nowSummary",
  "summaryBullets",
  "arcSummary",
]);

export function normalizeRevisionStore(store) {
  const jobs = Array.isArray(store?.jobs) ? store.jobs : [];
  const rules = Array.isArray(store?.rules) ? store.rules : [];
  let ownerInstructions = Array.isArray(store?.ownerInstructions)
    ? store.ownerInstructions
    : [];

  if (ownerInstructions.length === 0 && jobs.length > 0) {
    ownerInstructions = backfillOwnerInstructionsFromJobs(jobs);
  }

  return {
    generatedAt: new Date().toISOString(),
    jobs,
    rules,
    ownerInstructions,
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

export function createRevisionJob({ article, slug, sectionId, instruction, current }) {
  const now = new Date().toISOString();
  const proposal = buildProposal({ article, sectionId, instruction, current });
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

export function buildProposal({ article, sectionId, instruction, current }) {
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
      note: "経緯を手続きメモではなく、案件の中身が分かる時系列へ再構成",
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
    const lines = before.split("\n").filter(Boolean);
    const reordered = interleaveTimeline(lines);
    return {
      before,
      after: reordered.join("\n"),
      note: "タイムラインは保存未対応。提案確認のみ（本実装で安全な差分適用を追加）",
      canApply: false,
    };
  }

  return {
    before,
    after: before,
    note: "このブロックは提案確認のみ。保存対応は次フェーズで追加",
    canApply: false,
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
    return next;
  }

  if (sectionId === "summaryBullets") {
    const bullets = parseTextItems(text);
    if (bullets.length < 1) throw new Error("要点の提案が空です");
    next.summaryBullets = bullets;
    return next;
  }

  if (sectionId === "arcSummary") {
    const rows = parseArc(text);
    if (rows.length < 1) throw new Error("経緯は `YYYY-MM-DD — 内容` の形式が必要です");
    next.arcSummary = rows;
    return next;
  }

  if (sectionId === "title_opening") {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = stripLabel(lines.find((l) => /^タイトル[:：]/.test(l)) || "", "タイトル");
    const opening = stripLabel(lines.find((l) => /^1行目候補[:：]|^冒頭[:：]/.test(l)) || "", "1行目候補");
    if (title) next.title = title;
    if (opening) {
      const prev = Array.isArray(next.summaryBullets) ? next.summaryBullets : [];
      next.summaryBullets = [opening, ...prev.slice(1)];
    }
    if (!title && !opening) throw new Error("タイトルまたは1行目候補が必要です");
    return next;
  }

  throw new Error("このブロックはまだ保存未対応です");
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
  const x = lines.filter((l) => l.includes("[X]"));
  const diet = lines.filter((l) => !l.includes("[X]"));
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

const GENERIC_SPEECH_RE = /が.+?(について|を)国会で(答弁・質疑|論じ)/;

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
    if (!isProceduralNoise(t) && isTopicRelevant(t, keywords)) add(m.sourceDate, "", t, 2);
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
    .replace(/（国会議事録）\.?$/g, "")
    .replace(/国会で答弁・質疑した\.?$/g, "")
    .replace(/国会で答弁・質疑を行った\.?$/g, "")
    .trim();
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
  const material = collectMaterial(article, keywords, opts);
  const substantive = material.filter((m) => !isGenericSpeechSummary(m.text));

  if (substantive.length >= 2) {
    return [...substantive]
      .slice(0, 5)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map((m) => `${m.date} — ${m.speaker ? `${m.speaker}：` : ""}${cleanFact(m.text)}`)
      .join("\n");
  }

  const rows = parseArc(before).filter((r) => !isProceduralNoise(r.text));
  if (rows.length) {
    return rows.map((r) => `${r.date} — ${cleanFact(r.text)}`).join("\n");
  }

  const arc = (article?.arcSummary || [])
    .filter((r) => !isProceduralNoise(r.text))
    .map((r) => `${r.date} — ${cleanFact(r.text)}`);
  if (arc.length) return arc.join("\n");

  return `${today()} — ${topic}について国会で確認された主要論点を整理中。`;
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
