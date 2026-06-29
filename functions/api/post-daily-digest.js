/**
 * POST /api/post-daily-digest?pin=1192
 * 昼の3選を Buffer 経由で投稿（1日1回・slot=noon）
 */
import {
  todayJst,
  siteBase,
  loadLog,
  digestPostedToday,
  loadArticles,
  score,
  formatDigest,
  resolveChannel,
  postToBuffer,
  jsonResponse,
} from "../lib/x-marketing-worker.js";

export async function onRequestPost(context) {
  const { BUFFER_API_KEY, BUFFER_CHANNEL_ID, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");
  const force = url.searchParams.get("force") === "1";

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  if (!BUFFER_API_KEY) {
    return jsonResponse({ error: "BUFFER_API_KEY not configured" }, 503);
  }

  const base = siteBase(context.env, context.request.url);
  const day = todayJst();
  const log = await loadLog(base);

  if (!force && digestPostedToday(log, day)) {
    return jsonResponse({ ok: true, skipped: true, reason: `noon digest already posted ${day}` });
  }

  const articles = await loadArticles(base);
  const now = Date.now();
  const picks = [...articles]
    .map((a) => ({ a, s: score(a, now) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map((x) => x.a);

  if (picks.length < 1) {
    return jsonResponse({ error: "no live articles" }, 404);
  }

  const text = formatDigest(picks);
  const channelId = await resolveChannel(BUFFER_API_KEY, BUFFER_CHANNEL_ID || null);
  const post = await postToBuffer(BUFFER_API_KEY, channelId, text);

  return jsonResponse({
    ok: true,
    slot: "noon",
    day,
    slugs: picks.map((a) => a.slug),
    post,
    note: "log persist は GitHub Actions / ローカル script で更新",
  });
}
