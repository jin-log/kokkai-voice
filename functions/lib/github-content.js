/** GitHub contents API の base64 を UTF-8 テキストへ（atob 単体だと日本語が文字化けする） */
export function decodeGitHubBase64Utf8(b64) {
  const cleaned = b64.replace(/\n/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

/** UTF-8 テキストを GitHub contents API 用の base64 へ */
export function encodeGitHubBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
