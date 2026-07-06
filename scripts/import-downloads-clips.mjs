#!/usr/bin/env node
/**
 * ダウンロードフォルダのショート素材 → incoming へコピーして取り込み（元ファイル削除）
 * node scripts/import-downloads-clips.mjs [downloadsDir]
 */
import { copyFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const downloadsDir =
  process.argv[2] || path.join(process.env.USERPROFILE || "", "Downloads");
const incoming = path.join(root, "assets", "stock", "clips", "incoming");

/** @type {Record<string, string>} 元ファイル名（拡張子なし）→ incoming 名 */
const RENAME = {
  "勉強・学校・学生": "study-school-student.mov",
  "太陽光・エネルギー": "solar-energy-field.mov",
  "介護・高齢": "elderly-care.mp4",
  大阪城: "osaka-castle.mp4",
  スパイ: "spy-hoodie.mp4",
  "演説・政治家": "politician-speech.mp4",
  不法: "illegal-overstay.mp4",
};

async function main() {
  const names = await readdir(downloadsDir);
  const videos = names.filter((n) => /\.(mp4|mov)$/i.test(n));
  if (!videos.length) {
    console.log(`[import-downloads] 動画なし: ${downloadsDir}`);
    return;
  }

  let copied = 0;
  for (const name of videos) {
    const base = name.replace(/\.(mp4|mov)$/i, "");
    const destName = RENAME[base];
    if (!destName) {
      console.log(`[import-downloads] skip（未登録）: ${name}`);
      continue;
    }
    const src = path.join(downloadsDir, name);
    const dest = path.join(incoming, destName);
    await copyFile(src, dest);
    await rm(src, { force: true });
    console.log(`[import-downloads] ${name} → incoming/${destName}（元削除）`);
    copied++;
  }

  if (copied === 0) {
    console.log("[import-downloads] コピー対象なし");
    return;
  }

  const r = spawnSync(process.execPath, ["scripts/import-short-clips.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
