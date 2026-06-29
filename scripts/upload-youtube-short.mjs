#!/usr/bin/env node
/**
 * YouTube Shorts 自動アップロード
 *
 * Usage:
 *   npm run short:upload -- --slug shussho-budget-seika
 *   npm run short:upload -- --slug shussho-budget-seika --dry-run
 *   npm run short:upload -- --slug shussho-budget-seika --private
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { buildYoutubeUploadDraft } from "./lib/youtube-upload-draft.mjs";
import { loadToken } from "./lib/youtube-oauth.mjs";
import { postTopComment, uploadVideo } from "./lib/youtube-upload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes("--dry-run");
const skipComment = args.includes("--no-comment");
const slug = arg("--slug");
const visibility = args.includes("--private")
  ? "private"
  : args.includes("--unlisted")
    ? "unlisted"
    : "public";

if (!slug) {
  console.error("Usage: npm run short:upload -- --slug <slug> [--dry-run] [--private]");
  process.exit(1);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const outDir = path.join(root, "output", "shorts", slug);
  const videoPath = path.join(outDir, `${slug}-final.mp4`);
  const packJson = path.join(outDir, "youtube-upload.json");

  if (!(await fileExists(videoPath))) {
    console.error(`[short:upload] 動画がありません: ${videoPath}`);
    console.error("  → npm run short:generate -- --slug " + slug);
    process.exit(1);
  }

  /** @type {ReturnType<typeof buildYoutubeUploadDraft>} */
  let draft;
  if (await fileExists(packJson)) {
    draft = JSON.parse(await readFile(packJson, "utf8"));
  } else {
    const article = await loadArticle(slug);
    draft = buildYoutubeUploadDraft(article, {
      videoFile: path.relative(root, videoPath).replace(/\\/g, "/"),
    });
  }

  console.log(`[short:upload] slug=${slug} visibility=${visibility}`);
  console.log(`  title: ${draft.title}`);
  console.log(`  file:  ${videoPath}`);

  if (dryRun) {
    console.log("[short:upload] dry-run — アップロードしません");
    return;
  }

  const token = await loadToken();
  if (!token?.refresh_token) {
    console.error("[short:upload] 未認証 — 先に npm run youtube:auth");
    process.exit(1);
  }

  const result = await uploadVideo(videoPath, {
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    categoryId: draft.categoryId ?? "25",
    privacyStatus: visibility,
  });

  console.log(`[short:upload] OK videoId=${result.videoId}`);
  console.log(`  Shorts: ${result.url}`);
  console.log(`  Studio: ${result.studioUrl}`);

  let commentId = null;
  if (!skipComment && draft.pinnedComment) {
    try {
      const c = await postTopComment(result.videoId, draft.pinnedComment);
      commentId = c.id ?? null;
      console.log("[short:upload] コメント投稿 OK（ピン留めは Studio で手動）");
    } catch (e) {
      console.warn("[short:upload] コメント投稿スキップ:", e instanceof Error ? e.message : e);
    }
  }

  await mkdir(outDir, { recursive: true });
  const resultPath = path.join(outDir, "youtube-upload-result.json");
  const payload = {
    slug,
    uploadedAt: new Date().toISOString(),
    visibility,
    ...result,
    commentId,
    pinNote: "コメントのピン留めは YouTube Studio で手動",
  };
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[short:upload] log → ${path.relative(root, resultPath)}`);
}

main().catch((e) => {
  console.error("[short:upload]", e instanceof Error ? e.message : e);
  process.exit(1);
});
