#!/usr/bin/env node
/** 本番 API — 夜の単体（熱い日のみ） */
const base = process.env.SITE_URL || "https://seiji1192.site";
const pin = process.env.ADMIN_PIN || "1192";
const force = process.argv.includes("--force") ? "&force=1" : "";

const res = await fetch(`${base}/api/post-hot-single?pin=${encodeURIComponent(pin)}${force}`, {
  method: "POST",
});
const body = await res.json();
console.log(JSON.stringify(body, null, 2));
if (!res.ok || body.ok === false) process.exit(1);
if (body.skipped) console.log("SKIP:", body.reason);
else console.log("OK: 夜単体を投稿しました", body.slug);
