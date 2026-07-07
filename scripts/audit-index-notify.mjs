#!/usr/bin/env node
/** 公開URLが Google Indexing API に全件送信済みか監査 */
import { missingGoogleIndexUrls } from "../src/lib/search-notify.mjs";

const failOnMissing = process.argv.includes("--fail-on-missing");
const missing = await missingGoogleIndexUrls();

if (missing.length === 0) {
  console.log("OK: 公開中URLはすべて Google Indexing API 送信済み");
  process.exit(0);
}

console.error(`NG: Google 未送信 ${missing.length} 件`);
for (const u of missing) console.error(`  · ${u}`);
console.error("\n修復: npm run notify:search");
process.exit(failOnMissing ? 1 : 0);
