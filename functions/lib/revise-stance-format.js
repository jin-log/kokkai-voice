/** 〇×表 — 管理画面修正UI用のテキスト整形 */

/**
 * @param {object|null} matrix policy-matrix JSON
 * @returns {string}
 */
export function formatStanceReviseText(matrix) {
  const parties = matrix?.parties ?? [];
  if (!parties.length) return "(〇×表なし)";

  return parties
    .map((p) => {
      const symbol = p.symbol || "—";
      const label = p.partyLabel || "（党名未設定）";
      const stance = String(p.stance?.text || "").trim();
      const action = String(p.action?.text || "").trim();
      const reason = String(p.symbolReason || "").trim();
      const source = String(p.stance?.sourceUrl || p.action?.speechUrl || "").trim();
      const lines = [`${symbol} ${label}`];
      lines.push(`公言: ${stance || "（未設定）"}`);
      lines.push(`行動: ${action || "（未設定）"}`);
      if (reason) lines.push(`判定: ${reason}`);
      if (source) lines.push(`出典: ${source}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * @param {string} text
 * @returns {object[]|null}
 */
export function parseStanceApplyText(text) {
  const blocks = String(text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return null;

  /** @type {object[]} */
  const parties = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] || "";
    const headMatch = head.match(/^([◎○△×？〇◯—\-])\s+(.+)$/);
    if (!headMatch) return null;

    const partyLabel = headMatch[2].trim();
    const fields = {};
    for (const line of lines.slice(1)) {
      const m = line.match(/^(公言|行動|判定|出典)[:：]\s*(.*)$/);
      if (m) fields[m[1]] = m[2].trim();
    }
    if (!partyLabel) return null;
    parties.push({
      partyLabel,
      symbol: headMatch[1],
      stanceText: fields["公言"] || "",
      actionText: fields["行動"] || "",
      symbolReason: fields["判定"] || "",
      sourceUrl: fields["出典"] || "",
    });
  }
  return parties.length ? parties : null;
}

/**
 * @param {object} matrix
 * @param {string} after
 */
export function applyStanceProposal(matrix, after) {
  const parsed = parseStanceApplyText(after);
  if (!parsed) throw new Error("〇×表は「記号 党名」「公言:」「行動:」形式が必要です");

  const next = JSON.parse(JSON.stringify(matrix));
  const byLabel = new Map((next.parties || []).map((p) => [p.partyLabel, p]));

  for (const row of parsed) {
    const prev = byLabel.get(row.partyLabel);
    if (!prev) throw new Error(`党が見つかりません: ${row.partyLabel}`);
    prev.symbol = row.symbol;
    prev.stance = prev.stance || {};
    prev.action = prev.action || {};
    if (row.stanceText) prev.stance.text = row.stanceText;
    if (row.actionText) prev.action.text = row.actionText;
    if (row.symbolReason) prev.symbolReason = row.symbolReason;
    if (row.sourceUrl) {
      prev.stance.sourceUrl = row.sourceUrl;
      if (!prev.action.speechUrl) prev.action.speechUrl = row.sourceUrl;
    }
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * @param {object|null} matrix
 * @param {string} instruction
 * @param {string} before
 */
export function buildStanceProposalText(matrix, instruction, before) {
  const parties = matrix?.parties ?? [];
  if (!parties.length) {
    return {
      before,
      after: before,
      note: "policy-matrix JSON が未作成です。先に巡回または手動で matrix を作成してください",
      canApply: false,
    };
  }

  const hint = String(instruction || "").trim();
  const cleaned = parties.map((p) => {
    const stance = plainTone(shorten(cleanPartyLine(p.stance?.text), 120));
    let action = plainTone(shorten(cleanPartyLine(p.action?.text), 120));
    if (isRawDump(action)) {
      const date = p.action?.capturedAt || p.stance?.capturedAt || "";
      const meeting = /委員会/.test(action) ? action.match(/[^、。]{0,12}委員会/)?.[0] : "";
      action = date
        ? `${date}、${meeting || "国会"}で本件に関する表明・質疑`
        : "国会で本件に関する表明・質疑（詳細は議事録参照）";
    }
    return { ...p, stanceText: stance, actionText: action };
  });

  const after = cleaned
    .map((p) => {
      const lines = [`${p.symbol || "—"} ${p.partyLabel}`];
      lines.push(`公言: ${p.stanceText || "（未設定）"}`);
      lines.push(`行動: ${p.actionText || "（未設定）"}`);
      if (p.symbolReason) lines.push(`判定: ${p.symbolReason}`);
      const source = p.stance?.sourceUrl || p.action?.speechUrl;
      if (source) lines.push(`出典: ${source}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const emptyDisplay = /表示|空|何も|見えない|ない/.test(hint);
  const note = emptyDisplay
    ? "管理画面の表示バグを修正。公言・行動・判定を展開し、議事録生文は平易語に要約"
    : "各党の公言・行動を平易語で再整形（〇×表 JSON へ保存可）";

  return { before, after, note, canApply: true };
}

function cleanPartyLine(text) {
  return String(text || "")
    .replace(/国会で答弁・質疑した\.?$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRawDump(text) {
  const t = String(text || "");
  return t.length > 100 || /とが困難|御答弁|お尋ね/.test(t);
}

function shorten(text, max) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function plainTone(text) {
  return String(text || "")
    .replace(/しております/g, "している")
    .replace(/ございます/g, "ある")
    .replace(/であります/g, "である")
    .replace(/\s+/g, " ")
    .trim();
}
