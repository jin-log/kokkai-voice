#!/usr/bin/env node
/**
 * YouTube Shorts アップロードパック生成
 *
 * Usage:
 *   npm run short:upload-pack
 *   npm run short:upload-pack -- --slug shussho-budget-seika
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { buildYoutubeUploadDraft, formatUploadTxt } from "./lib/youtube-upload-draft.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

/** 投稿順（予算フック先） */
const DEFAULT_SLUGS = ["shussho-budget-seika", "shoshika"];

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function packOne(slug, postOrder) {
  const article = await loadArticle(slug);
  const outDir = path.join(root, "output", "shorts", slug);
  await mkdir(outDir, { recursive: true });

  const videoAbs = path.join(outDir, `${slug}-final.mp4`);
  const hasVideo = await fileExists(videoAbs);

  const draft = buildYoutubeUploadDraft(article, {
    postOrder,
    videoFile: path.relative(root, videoAbs).replace(/\\/g, "/"),
  });

  const jsonPath = path.join(outDir, "youtube-upload.json");
  const txtPath = path.join(outDir, "youtube-upload.txt");

  await writeFile(jsonPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  await writeFile(txtPath, formatUploadTxt(draft), "utf8");

  console.log(`[upload-pack] ${slug}`);
  console.log(`  video: ${hasVideo ? "OK" : "MISSING"} ${draft.videoFile}`);
  console.log(`  → ${path.relative(root, txtPath)}`);
  return { slug, txtPath, videoAbs, hasVideo, draft };
}

async function main() {
  const slugArg = arg("--slug");
  const slugs = slugArg ? [slugArg] : DEFAULT_SLUGS;
  const results = [];

  for (let i = 0; i < slugs.length; i++) {
    results.push(await packOne(slugs[i], i + 1));
  }

  const indexPath = path.join(root, "output", "shorts", "UPLOAD-README.txt");
  const index = [
    "YouTube Shorts アップロード手順",
    "",
    "1. https://studio.youtube.com/ を開く（Chrome推奨）",
    "2. 「作成」→「動画をアップロード」",
    "3. 各フォルダの youtube-upload.txt を開き、タイトル・説明をコピペ",
    "",
    "投稿順:",
    ...results.map(
      (r) =>
        `  ${r.draft.postOrder}. ${r.slug} — ${r.draft.title.replace(" #shorts", "")}`,
    ),
    "",
    "ファイル:",
    ...results.map((r) => `  ${r.draft.videoFile}`),
    ...results.map((r) => `  output/shorts/${r.slug}/youtube-upload.txt`),
    "",
    "2本目は3〜7日あけて投稿推奨。",
    "",
  ].join("\n");

  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, index, "utf8");
  console.log(`[upload-pack] index → ${path.relative(root, indexPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
