/**
 * 国会API検索用キーワード候補（装飾・接尾辞を落として再試行）
 * @param {string} keyword
 */
export function kokkaiKeywordCandidates(keyword) {
  const raw = String(keyword ?? "").trim();
  if (!raw) return [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  const push = (k) => {
    const t = String(k ?? "").trim();
    if (!t || t.length < 2 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const stripDecor = (s) =>
    s
      .replace(/[【】]/g, " ")
      .replace(/どうなったの[?？]?/g, "")
      .replace(/[?？]/g, "")
      .replace(/とは$|って何$/g, "")
      .replace(/\s+/g, " ")
      .trim();

  push(raw);
  push(stripDecor(raw));

  for (const m of raw.matchAll(/【([^】]+)】/g)) {
    push(m[1].trim());
    push(stripDecor(m[1]));
  }

  for (const suf of ["改正案", "法案", "の状況", "について", "問題", "法", "案"]) {
    const snapshot = [...out];
    for (const base of snapshot) {
      if (base.endsWith(suf) && base.length > suf.length + 2) {
        push(base.slice(0, -suf.length));
      }
    }
  }

  // 「国会議員のボーナス」→「国会議員」「ボーナス」
  for (const base of [...out]) {
    const m = base.match(/^(.+?)の([^の]{2,})$/);
    if (m) {
      push(m[1].trim());
      push(m[2].trim());
    }
  }

  if (/[\s　]/.test(raw)) {
    for (const part of raw.split(/[\s　]+/)) push(stripDecor(part));
  }

  return out;
}
