#!/usr/bin/env node
/**
 * 国会議事録 API — 発言検索して JSON 保存
 * 用法: node scripts/fetch-speech.mjs --keyword 物価 --from 2026-01-01 --until 2026-06-30
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSpeech } from "./lib/kokkai-api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const keyword = arg("keyword");
if (!keyword) {
  console.error("Usage: node scripts/fetch-speech.mjs --keyword <word> [--from YYYY-MM-DD] [--until YYYY-MM-DD] [--out path]");
  process.exit(1);
}

const from = arg("from", "2026-01-01");
const until = arg("until", new Date().toISOString().slice(0, 10));
const out =
  arg("out") ||
  path.join(root, "data/raw/speeches", `${keyword.replace(/\s+/g, "_")}_${from}_${until}.json`);

const data = await fetchSpeech({
  any: keyword,
  from,
  until,
  maximumRecords: 30,
});

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(data, null, 2), "utf8");
console.log(`saved: ${out} (${data.numberOfRecords ?? 0} hits, ${data.speechRecord?.length ?? 0} returned)`);
