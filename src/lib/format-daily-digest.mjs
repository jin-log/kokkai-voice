import { articleShortTitle } from "./case-helpers.mjs";
import { buildSharePayload } from "./share.mjs";
import { clip } from "./promo-generate.mjs";
import { SITE } from "./site-config.mjs";

/** X 単一投稿の上限（Buffer も同じ） */
export const X_POST_MAX_CHARS = 280;

/** @param {string} title */
export function digestItemTitle(title) {
  const m = String(title).match(/^【([^】]+)】(.+)?$/);
  if (m) return clip(`${m[1]}${m[2] ? ` ${m[2]}` : ""}`, 32);
  return clip(title, 32);
}

/**
 * @param {import('./articles.mjs').Article[]} articles
 * @param {number} [maxChars]
 */
export function formatDailyDigestPost(articles, maxChars = X_POST_MAX_CHARS) {
  const marks = ["①", "②", "③"];
  const footer = "出典付きで追います";
  const header = `【${SITE.shortLabel} 今日の3選】`;

  /** @param {number} titleLen */
  function build(titleLen) {
    const lines = [header, ""];
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const { pageUrl } = buildSharePayload(article);
      const head = clip(digestItemTitle(articleShortTitle(article)), titleLen);
      lines.push(`${marks[i] || `${i + 1}.`} ${head}`);
      lines.push(pageUrl);
      if (i < articles.length - 1) lines.push("");
    }
    lines.push("", footer);
    return lines.join("\n").trim();
  }

  for (let titleLen = 32; titleLen >= 12; titleLen -= 2) {
    const text = build(titleLen);
    if (text.length <= maxChars) return text;
  }

  const text = build(12);
  if (text.length > maxChars) {
    throw new Error(`digest が ${text.length} 文字 — X上限 ${maxChars} を超えています`);
  }
  return text;
}
