export const APPLIABLE_SECTIONS = new Set([
  "title_opening",
  "nowSummary",
  "summaryBullets",
  "arcSummary",
]);

export function normalizeRevisionStore(store) {
  return {
    generatedAt: new Date().toISOString(),
    jobs: Array.isArray(store?.jobs) ? store.jobs : [],
    rules: Array.isArray(store?.rules) ? store.rules : [],
  };
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

  if (!hint) {
    return { before, after: before, note: "指示が空です", canApply: false };
  }

  if (sectionId === "nowSummary") {
    return {
      before,
      after: numbered([
        `${topic}について、国会で複数の質疑・答弁が出ているが、現時点で読者に示せる確定事項は限定的です。`,
        `答弁は政府の認識や検討状況を確認する内容が中心で、「何が決まったのか」は未確定のままです。`,
        `この記事では、答弁の列挙ではなく、国会で確認された点と残っている論点を整理します。`,
      ]),
      note: `指示を問題指摘として解釈し、「答弁の列挙」から「何が明らかか／未確定か」へ再構成`,
      canApply,
    };
  }

  if (sectionId === "summaryBullets") {
    return {
      before,
      after: bulletLines([
        `${topic}で国会上確認できた事実を先に整理`,
        `答弁・質疑の列挙ではなく、読者にとっての意味を短く要約`,
        `未確定部分は断定せず、今後の論点として分ける`,
      ]),
      note: "要点を「事実・意味・未確定」に分け直す提案",
      canApply,
    };
  }

  if (sectionId === "arcSummary") {
    const rows = parseArc(before);
    const next = rows.length
      ? rows.map((r) => `${r.date} — ${tightenArcText(r.text, topic)}`).join("\n")
      : `${today()} — ${topic}について、国会で確認された点と未確定の論点を整理。`;
    return {
      before,
      after: next,
      note: "経緯を答弁メモではなく、案件の進行が分かる文に整える提案",
      canApply,
    };
  }

  if (sectionId === "title_opening") {
    return {
      before,
      after: [`タイトル: ${article?.title || topic}`, `1行目候補: ${topic}は、現時点で何が決まり、何が未確定かを整理する段階です。`].join("\n"),
      note: "タイトルに対して冒頭1文で答える提案",
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
