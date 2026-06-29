/** 1行テロップの最大幅（px） */
export const TELOP_MAX_WIDTH = 980;

const MIN_FONT = 48;

/**
 * 幅に収まるようフォントサイズを縮小（改行させない）
 */
export function fontSizeForLine(text: string, baseSize: number): number {
  const charW = 1.02;
  const needed = text.length * baseSize * charW;
  if (needed <= TELOP_MAX_WIDTH) return baseSize;
  return Math.max(MIN_FONT, Math.floor(TELOP_MAX_WIDTH / (text.length * charW)));
}

/**
 * 禁則: 最終行が1〜2文字になる分割を避ける
 * @param {string} text
 * @param {number} maxPerLine
 * @returns {string[]}
 */
export function balanceTelopLines(text, maxPerLine = 14) {
  if (text.length <= maxPerLine) return [text];

  const cuts = ["、", "。", "？", "！", "・", "は", "が", "を", "に", "の"];
  const mid = Math.ceil(text.length / 2);
  let best = -1;
  let bestDist = Infinity;

  for (let i = 1; i < text.length; i++) {
    const a = text.slice(0, i).trim();
    const b = text.slice(i).trim();
    if (!a || !b) continue;
    if (b.length <= 2) continue;
    if (a.length > maxPerLine + 2 || b.length > maxPerLine + 2) continue;
    const dist = Math.abs(i - mid);
    const bonus = cuts.includes(text[i - 1]) || cuts.includes(text[i]) ? -3 : 0;
    const score = dist + bonus;
    if (score < bestDist) {
      bestDist = score;
      best = i;
    }
  }

  if (best > 0) {
    return [text.slice(0, best).trim(), text.slice(best).trim()].filter(Boolean);
  }

  if (text.length <= maxPerLine * 2) {
    const i = Math.max(3, mid);
    const a = text.slice(0, i);
    const b = text.slice(i);
    if (b.length <= 2) return [text];
    return [a, b];
  }

  return [text.slice(0, maxPerLine), text.slice(maxPerLine)];
}
