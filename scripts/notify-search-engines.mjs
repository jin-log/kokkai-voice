#!/usr/bin/env node
/**
 * 検索エンジン更新通知（IndexNow + Google Indexing API）
 *
 *   node scripts/notify-search-engines.mjs --slug shussho-budget-seika
 *   node scripts/notify-search-engines.mjs --recent 7
 *   node scripts/notify-search-engines.mjs --live
 *   node scripts/notify-search-engines.mjs --live --ensure-all   # デプロイ後必須
 *   node scripts/notify-search-engines.mjs --audit               # 未送信一覧のみ
 */
import {
  notifySearchEngines,
  ensureIndexNowKeyFile,
  missingGoogleIndexUrls,
} from "../src/lib/search-notify.mjs";
import { loadGoogleCredentials } from "../src/lib/google-indexing.mjs";

function parseArgs(argv) {
  const opts = { recentDays: 0, allLive: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug" && argv[i + 1]) opts.slug = argv[++i];
    else if (a === "--recent" && argv[i + 1]) opts.recentDays = Number(argv[++i]) || 7;
    else if (a === "--live") opts.allLive = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--ensure-all") opts.ensureAll = true;
    else if (a === "--audit") opts.auditOnly = true;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  if (opts.auditOnly) return opts;
  if (!opts.slug && !opts.allLive && !opts.recentDays) opts.recentDays = 3;
  if (opts.ensureAll) opts.allLive = true;
  return opts;
}

const opts = parseArgs(process.argv);

if (opts.help) {
  console.log(`用法:
  --slug <slug>       1案件だけ通知
  --recent <days>     直近N日に更新/公開された案件
  --live              公開中全URL + 静的ページ
  --ensure-all        未送信URLを必ず Google に送る（デプロイ後）
  --audit             未送信URL一覧（送信しない）
  --force             24h制限を無視して全件再送
  --dry-run           送信せずURL一覧のみ`);
  process.exit(0);
}

if (opts.auditOnly) {
  const missing = await missingGoogleIndexUrls(opts.slug ? { slug: opts.slug } : {});
  console.log(`公開中URLのうち Google 未送信: ${missing.length} 件`);
  for (const u of missing) console.log(`  · ${u}`);
  process.exit(missing.length > 0 ? 1 : 0);
}

await ensureIndexNowKeyFile();

if (opts.ensureAll && !opts.dryRun) {
  const creds = await loadGoogleCredentials();
  if (!creds) {
    console.error("NG: --ensure-all には Google 認証が必須です（secrets/google-service-account.json）");
    process.exit(1);
  }
}

const { urlList, indexNow, sitemaps, google, missingBefore, stillMissing } =
  await notifySearchEngines({
    slug: opts.slug,
    recentDays: opts.recentDays || undefined,
    allLive: opts.allLive,
    dryRun: opts.dryRun,
    force: opts.force,
    ensureAll: opts.ensureAll,
    mustSubmitMissing: opts.ensureAll,
  });

console.log(`\n通知対象: ${urlList.length} URL`);
if (missingBefore.length) {
  console.log(`Google 未送信（今回優先）: ${missingBefore.length} 件`);
  for (const u of missingBefore.slice(0, 12)) console.log(`  · ${u}`);
  if (missingBefore.length > 12) console.log(`  … 他 ${missingBefore.length - 12} 件`);
}
for (const u of urlList.slice(0, 8)) console.log(`  · ${u}`);
if (urlList.length > 8) console.log(`  … 他 ${urlList.length - 8} 件`);

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
    for (const f of r.failed.slice(0, 5)) console.log(`    · ${f.url} — ${f.error}`);
  }
}

if (stillMissing?.length) {
  console.error(`\nNG: Google 未送信が ${stillMissing.length} 件残っています`);
  for (const u of stillMissing) console.error(`  · ${u}`);
}

const googleHardFail = google.some((r) => !r.ok && !r.skipped);
const indexNowFail = indexNow.every((r) => !r.ok);
const missingFail = (stillMissing?.length ?? 0) > 0;
process.exit(
  !opts.dryRun && (googleHardFail || indexNowFail || missingFail) ? 1 : 0,
);
