#!/usr/bin/env node
/** 本番 API — 日次3選（Mac ローカル buffer.env 不要） */
const base = process.env.SITE_URL || "https://seiji1192.site";
const pin = process.env.ADMIN_PIN || "1192";
const force = process.argv.includes("--force") ? "&force=1" : "";

const res = await fetch(`${base}/api/post-daily-digest?pin=${encodeURIComponent(pin)}${force}`, {
  method: "POST",
});
const body = await res.json();
console.log(JSON.stringify(body, null, 2));
if (!res.ok || (body.ok === false)) process.exit(1);
if (body.skipped) console.log("SKIP:", body.reason);
else console.log("OK: 日次3選を投稿しました");
