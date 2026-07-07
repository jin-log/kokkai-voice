#!/usr/bin/env node
/** 14-store-log API から全店舗CSVを取得（Playwright不要・高速版） */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://14-store-log-api-production.up.railway.app/api/stores";
const SITE = "https://www.14-store-log.com/stores";
const OUT_PATHS = [
  path.join(ROOT, "data", "stores.csv"),
  "D:/ダウンロード/stores.csv",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function politeDelay() {
  await sleep(1000 + Math.random() * 1000);
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatCategory(category, subCategory) {
  const main = String(category ?? "").trim();
  const sub = String(subCategory ?? "").trim();
  if (!main) return sub;
  if (!sub || sub === main) return main;
  return `${main}・${sub}`;
}

function mapRow(store) {
  const addr = store.address ?? {};
  return {
    ownerName: store.ownerName ?? "",
    name: store.name ?? "",
    category: formatCategory(store.category, store.subCategory),
    link: store.storeUrl ?? "",
    xTag: store.hashtag ?? "",
    url: `${SITE}/${store.id}`,
    dc: store.dataCenter ?? "",
    server: store.world ?? "",
    residentialArea: [addr.city, addr.ward].filter(Boolean).join(" ").trim(),
    lot: [addr.streetAddress, addr.roomNumber].filter(Boolean).join(" ").trim(),
  };
}

function writeCsv(rows, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const header = "オーナー名,店名,種類,リンク,Xタグ,URL（情報元）,DC,サーバー,居住区,番地";
  const body = rows
    .map((row) =>
      [
        row.ownerName,
        row.name,
        row.category,
        row.link,
        row.xTag,
        row.url,
        row.dc,
        row.server,
        row.residentialArea,
        row.lot,
      ]
        .map(csvEscape)
        .join(","),
    )
    .join("\n");
  writeFileSync(outPath, `\uFEFF${header}\n${body}\n`, "utf8");
}

async function main() {
  const rows = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API}?page=${page}&limit=20&search=&dataCenter=&category=`;
    console.log(`[${page}/${totalPages}] ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} page=${page}`);
    const data = await res.json();
    totalPages = data.totalPages ?? 1;
    for (const store of data.stores ?? []) rows.push(mapRow(store));
    console.log(`  +${data.stores?.length ?? 0}件（累計 ${rows.length}）`);
    if (page < totalPages) await politeDelay();
    page++;
  }

  for (const out of OUT_PATHS) {
    writeCsv(rows, out);
    console.log(`OK ${rows.length} 件 → ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
