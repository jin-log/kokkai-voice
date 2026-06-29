#!/usr/bin/env node
/** 本番 API 経由でプレリリース告知（Mac ローカル buffer.env 不要） */
const base = process.env.SITE_URL || "https://seiji1192.site";
const pin = process.env.ADMIN_PIN || "1192";

const res = await fetch(`${base}/api/post-prerelease?pin=${encodeURIComponent(pin)}`, {
  method: "POST",
});
const body = await res.json();
console.log(JSON.stringify(body, null, 2));
if (!res.ok || !body.ok) process.exit(1);
console.log("OK: プレリリース告知を投稿しました");
