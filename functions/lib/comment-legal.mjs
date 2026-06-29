/**
 * コメントのハードブロック
 * - 明確な違反のみ自動拒否（曖昧な政治批判は通す → 通報）
 * - 返却は ok のみ。理由はクライアントに出さない。
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

/**
 * コメント欄での根拠なき個人攻撃・犯罪示唆（記事本文の引用は対象外＝コメントのみ）
 * 政治意見の強い言い回し（「反対」「おかしい」等）は通す。
 */
const DEFAMATION_PATTERNS = [
  /不倫/,
  /揉み消し?/,
  /隠蔽(した|して)/,
  /は詐欺/,
  /犯罪者/,
  /痴漢/,
  /ワイセツ/,
  /裏金/,
  /癒着/,
  /パワハラ/,
  /セクハラ/,
  /スパイ/,
  /売国(奴|賊)?/,
];

const HARD_BLOCK = [
  ...ELECTION_PATTERNS,
  ...PII_PATTERNS,
  ...OPERATOR_PII,
  ...THREAT_PATTERNS,
  ...DEFAMATION_PATTERNS,
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
