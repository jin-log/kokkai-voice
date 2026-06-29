/**
 * X 投稿 UI 用（タイムライン）
 */
export const X_POST_EXCERPT_LEN = 72;

/** @param {string} text */
export function excerptXPostText(text) {
  const t = String(text || "").trim();
  if (t.length <= X_POST_EXCERPT_LEN) {
    return { excerpt: t, isLong: false, full: t };
  }
  return {
    excerpt: `${t.slice(0, X_POST_EXCERPT_LEN).trim()}…`,
    isLong: true,
    full: t,
  };
}

/** @param {string | undefined | null} screenshot @param {string | undefined | null} thumb */
export function xScreenshotThumb(screenshot, thumb) {
  if (thumb) return thumb;
  if (!screenshot) return null;
  if (screenshot.includes("-thumb.")) return screenshot;
  return screenshot.replace(/\.(png|jpe?g|webp)$/i, "-thumb.webp");
}

/** @type {Record<string, { label: string; badgeClass: string; cardClass: string }>} */
export const TIMELINE_SOURCE = {
  x_post: { label: "X", badgeClass: "source-badge--x", cardClass: "event-card--x" },
  speech: { label: "国会", badgeClass: "source-badge--diet", cardClass: "event-card--diet" },
  milestone: { label: "出来事", badgeClass: "source-badge--milestone", cardClass: "event-card--milestone" },
  source: { label: "出典", badgeClass: "source-badge--source", cardClass: "event-card--source" },
};
