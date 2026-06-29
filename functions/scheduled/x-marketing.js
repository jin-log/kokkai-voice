/**
 * Cloudflare Cron — 昼3選 (03:00 UTC) / 夜単体 (10:00 UTC)
 * wrangler.toml [triggers] と対応
 */
const CRON_NOON = "0 3 * * *";
const CRON_EVENING = "0 10 * * *";

export async function onSchedule(context) {
  const { cron, env } = context;
  const pin = env.ADMIN_PIN || "1192";
  const base = (env.SITE_URL || "https://seiji1192.site").replace(/\/$/, "");

  let path;
  if (cron === CRON_NOON) path = "/api/post-daily-digest";
  else if (cron === CRON_EVENING) path = "/api/post-hot-single";
  else return;

  const url = `${base}${path}?pin=${encodeURIComponent(pin)}`;
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ cron, status: res.status, body }));
}
