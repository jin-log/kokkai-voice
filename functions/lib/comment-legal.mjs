/**
 * コメントのハードブロック（最小限）
 * - 噂・強い批判・スキャンダル話は通す → 通報・管理画面で対応
 * - 自動拒否は公職選挙法・個人情報・暴力的脅迫のみ
 */

/** 公職選挙法 — 投票・支持の呼びかけ（肯定・否定どちらも） */
const ELECTION_PATTERNS = [
  /投票し(てください|ろ|ないで|るな|な)/,
  /絶対に投票/,
  /[○◯〇✓]票/,
  /票を入れ(て|ろ|るな|ないで)/,
  /に一票/,
  /を当選させ(て|ろ|ないで|るな)/,
  /支持し(てください|ろ|ないで|るな)/,
  /応援し(てください|ろ|ないで|るな)/,
  /当選(させ|し)ろ/,
];

/** 個人情報・連絡先 */
const PII_PATTERNS = [
  /\d{2,4}-\d{2,4}-\d{4}/,
  /[〒]\s*\d{3}-\d{4}/,
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
];

/** 運営者の個人特定 */
const OPERATOR_PII = [/國脇/, /くにわき/, /bero19800228/];

/** 暴力的脅迫 */
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
