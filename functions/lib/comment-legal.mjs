/**
 * コメント自動拒否 — YouTube型（明確なNGワードのみ）
 * - 卑猥語・殺害予告 → 即ブロック
 * - それ以外（噂・投票呼びかけ・個人情報等）→ 通報・管理画面で対応
 */

/** 殺害予告・暴力的殺害表現 */
const MURDER_THREAT_PATTERNS = [
  /死ね/,
  /殺せ/,
  /殺して(やる|くれ|しまう)/,
  /殺してあげ/,
  /ぶっ殺/,
  /殺す(ぞ|わ|から|気)/,
  /殺害(する|しろ|して)/,
];

/** 卑猥語（一発でアウトと分かるもののみ） */
const OBSCENE_PATTERNS = [
  /ちんこ|チンコ|ちんぽ|チンポ|ち●こ/,
  /まんこ|マンコ|ま●こ/,
  /おっぱい見せ/,
  /セックスし(て|ろ|よう)/,
  /中出し/,
  /フェラ/,
  /クンニ/,
  /アナル(セックス|犯)/,
  /\bfuck\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /ファック/,
];

const HARD_BLOCK = [...MURDER_THREAT_PATTERNS, ...OBSCENE_PATTERNS];

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
