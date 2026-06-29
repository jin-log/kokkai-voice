/**
 * コメントのハードブロックのみ（曖昧な表現は通す → 通報で対応）
 * 返却は ok のみ。理由はクライアントに出さない。
 */

/** 公職選挙法 — 投票・当選の明確な誘導 */
const ELECTION_PATTERNS = [
  /[○◯〇✓]票を入れ/,
  /投票してください/,
  /に一票/,
  /を当選させ/,
];

/** 個人情報・連絡先 */
const PII_PATTERNS = [
  /\d{2,4}-\d{2,4}-\d{4}/,
  /[〒]\s*\d{3}-\d{4}/,
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
];

/** 運営者の個人特定 */
const OPERATOR_PII = [/國脇/, /くにわき/, /bero19800228/];

/** 暴力的脅迫のみ（政治批判の強い言い回しは対象外） */
const THREAT_PATTERNS = [/死ね/, /殺せ/, /消えろ/];

const HARD_BLOCK = [
  ...ELECTION_PATTERNS,
  ...PII_PATTERNS,
  ...OPERATOR_PII,
  ...THREAT_PATTERNS,
];

/** @param {string} text */
export function scanCommentLegal(text) {
  const t = String(text ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return { ok: false };
  if (t.length > 500) return { ok: false };
  for (const p of HARD_BLOCK) {
    if (p.test(t)) return { ok: false };
  }
  return { ok: true };
}
