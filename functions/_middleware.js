/**
 * 管理系パス — レスポンスヘッダで noindex を強制（HTML より優先される）
 */
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  const isPrivate =
    path.startsWith("/dev/") ||
    path.startsWith("/api/") ||
    path === "/status" ||
    path.startsWith("/status/");

  const response = await context.next();

  if (!isPrivate) return response;

  const headers = new Headers(response.headers);
  headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex",
  );
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Cache-Control", "private, no-store, max-age=0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
