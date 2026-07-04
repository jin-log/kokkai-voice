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
  const educationLaw = isEducationLawContext(article, hint, before);

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
