/**
 * コメントのハードブロック
 * - 法的リスク・ドシモネタは拒否。政策批判は通す。
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

/** 根拠なき犯罪・スキャンダル示唆（ドシモネタ含む） */
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
  /逮捕(だろ|間違いない|確実|された)/,
  /(は|が|も)逮捕(だろ|される|された|間違いない|確実)/,
  /(は|が)起訴/,
  /収賄/,
  /汚職/,
  /横領/,
  /脱税(した|してる|だろ)/,
  /愛人(が|を|と)/,
  /素行不良/,
  /写真流出/,
  /流出(した|してる|映像)/,
  /ドシ(ップ)?/,
  /ゴシップ/,
  /との噂/,
  /風説を流/,
  /尾行(した|して)/,
  /裏口(入試|入学)/,
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
