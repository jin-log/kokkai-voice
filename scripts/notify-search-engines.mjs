#!/usr/bin/env node
/**
 * 検索エンジン更新通知（IndexNow + Bing サイトマップ ping）
 *
 *   node scripts/notify-search-engines.mjs --slug shussho-budget-seika
 *   node scripts/notify-search-engines.mjs --recent 7
 *   node scripts/notify-search-engines.mjs --live
 *   node scripts/notify-search-engines.mjs --live --dry-run
 */
import { notifySearchEngines, ensureIndexNowKeyFile } from "../src/lib/search-notify.mjs";

function parseArgs(argv) {
  const opts = { recentDays: 0, allLive: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug" && argv[i + 1]) opts.slug = argv[++i];
    else if (a === "--recent" && argv[i + 1]) opts.recentDays = Number(argv[++i]) || 7;
    else if (a === "--live") opts.allLive = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  if (!opts.slug && !opts.allLive && !opts.recentDays) opts.recentDays = 3;
  return opts;
}

const opts = parseArgs(process.argv);

if (opts.help) {
  console.log(`用法:
  --slug <slug>     1案件だけ通知
  --recent <days>   直近N日に更新/公開された案件
  --live            公開中全URL + 静的ページ（デプロイ後デフォルト）
  --dry-run         送信せずURL一覧のみ`);
  process.exit(0);
}

await ensureIndexNowKeyFile();

const { urlList, indexNow, sitemaps, google } = await notifySearchEngines({
  slug: opts.slug,
  recentDays: opts.recentDays || undefined,
  allLive: opts.allLive,
  dryRun: opts.dryRun,
  force: opts.force,
});

console.log(`\n通知対象: ${urlList.length} URL`);
for (const u of urlList.slice(0, 12)) console.log(`  · ${u}`);
if (urlList.length > 12) console.log(`  … 他 ${urlList.length - 12} 件`);

console.log("\n[IndexNow]");
for (const r of indexNow) {
  const mark = r.ok ? "OK" : "NG";
  console.log(`  ${mark} ${r.service} (${r.status})${r.error ? ` — ${r.error}` : ""}`);
}

console.log("\n[Sitemap ping]");
for (const r of sitemaps) {
  const mark = r.ok ? "OK" : "NG";
  console.log(`  ${mark} ${r.service} (${r.status})${r.error ? ` — ${r.error}` : ""}`);
}

console.log("\n[Google Indexing API]");
for (const r of google) {
  if (r.skipped) {
    console.log(`  SKIP ${r.service} — ${r.message}`);
    continue;
  }
  const mark = r.ok ? "OK" : "NG";
  const detail = r.submitted != null ? `${r.submitted}/${r.count}件` : "";
  console.log(`  ${mark} ${r.service} (${r.status}) ${detail}${r.error ? ` — ${r.error}` : ""}`);
  if (r.failed?.length) {
    for (const f of r.failed.slice(0, 3)) console.log(`    · ${f.url} — ${f.error}`);
  }
}

console.log("\n※ Google 認証未設定時は docs/google-indexing-setup.md。週次のパフォーマンス確認だけ GSC でOK。");

const googleHardFail = google.some((r) => !r.ok && !r.skipped);
const indexNowFail = indexNow.every((r) => !r.ok);
process.exit((googleHardFail || indexNowFail) && !opts.dryRun ? 1 : 0);
