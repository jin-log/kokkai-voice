/** @param {string} s */
export function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 表示用: 外部URLをクリック可能リンクに（新しいタブ） */
/** @param {string} text */
export function linkifyExternalUrls(text) {
  const escaped = escapeHtml(text || "");
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="ops-link-external">$1</a>',
  );
}

/** @param {string} text */
export function isExternalUrl(text) {
  return /^https?:\/\//.test((text || "").trim());
}
