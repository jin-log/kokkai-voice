/**
 * POST /api/post-hot-single?pin=1192
 * 夜の単体 — スコア閾値以上のときだけ（1日最大2本のうち2本目）
 */
import {
  todayJst,
  siteBase,
  loadLog,
  hotPostedToday,
  postsTodayCount,
  loadArticles,
  score,
  formatSingle,
  resolveChannel,
  postToBuffer,
  jsonResponse,
  HOT_THRESHOLD,
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

  if (!force && hotPostedToday(log, day)) {
    return jsonResponse({ ok: true, skipped: true, reason: `evening hot already posted ${day}` });
  }
  if (!force && postsTodayCount(log, day) >= 2) {
    return jsonResponse({ ok: true, skipped: true, reason: "daily cap (2) reached" });
  }

  const articles = await loadArticles(base);
  const now = Date.now();
  const digestSlugs = new Set(log.digest?.find((p) => p.date === day)?.slugs ?? []);
  const ranked = articles
    .filter((a) => !digestSlugs.has(a.slug))
    .map((a) => ({ a, s: score(a, now, { evening: true }) }))
    .sort((x, y) => y.s - x.s);
  const top = ranked[0];

  if (!top || top.s < HOT_THRESHOLD) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "below_threshold",
      topScore: top?.s ?? 0,
      threshold: HOT_THRESHOLD,
    });
  }

  const article = top.a;
  const text = formatSingle(article);
  const channelId = await resolveChannel(BUFFER_API_KEY, BUFFER_CHANNEL_ID || null);
  const post = await postToBuffer(BUFFER_API_KEY, channelId, text);

  return jsonResponse({
    ok: true,
    slot: "evening",
    day,
    slug: article.slug,
    score: top.s,
    post,
    note: "log persist は GitHub Actions / ローカル script で更新",
  });
}
