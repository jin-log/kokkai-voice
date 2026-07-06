#!/usr/bin/env node
/**
 * YouTube Shorts 自動アップロード
 *
 * Usage:
 *   npm run short:upload -- --slug shussho-budget-seika
 *   npm run short:upload -- --slug osaka-to-metropolis --file output/shorts/data/osaka-to-metropolis-truth.mp4
 *   npm run short:upload -- --slug osaka-to-metropolis --file ... --at 7:00
 *   npm run short:upload -- --slug shussho-budget-seika --dry-run
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { buildYoutubeUploadDraft } from "./lib/youtube-upload-draft.mjs";
import { parseJstAt } from "./lib/jst-schedule.mjs";
import { loadToken } from "./lib/youtube-oauth.mjs";
import { enqueuePendingComment } from "./lib/youtube-pending-comments.mjs";
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
const fileArg = arg("--file");
const atArg = arg("--at");
const visibility = args.includes("--private")
  ? "private"
  : args.includes("--unlisted")
    ? "unlisted"
    : "public";

if (!slug) {
  console.error(
    "Usage: npm run short:upload -- --slug <slug> [--file path] [--at 7:00] [--dry-run]",
  );
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
  const defaultVideo = path.join(outDir, `${slug}-final.mp4`);
  const videoPath = fileArg
    ? path.isAbsolute(fileArg)
      ? fileArg
      : path.join(root, fileArg)
    : defaultVideo;
  const packJson = path.join(outDir, "youtube-upload.json");

  if (!(await fileExists(videoPath))) {
    console.error(`[short:upload] 動画がありません: ${videoPath}`);
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

  const publishAt = atArg ? parseJstAt(atArg) : null;
  const mode = publishAt ? "scheduled" : visibility;

  console.log(`[short:upload] slug=${slug} mode=${mode}`);
  console.log(`  title: ${draft.title}`);
  console.log(`  file:  ${videoPath}`);
  if (publishAt) console.log(`  publishAt(JST): ${publishAt}`);

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
    privacyStatus: publishAt ? "private" : visibility,
    publishAt: publishAt ?? undefined,
  });

  console.log(`[short:upload] OK videoId=${result.videoId}`);
  console.log(`  Shorts: ${result.url}`);
  console.log(`  Studio: ${result.studioUrl}`);

  let commentId = null;
  let commentQueued = false;
  if (!skipComment && draft.pinnedComment) {
    if (publishAt) {
      await enqueuePendingComment({
        videoId: result.videoId,
        slug,
        commentText: draft.pinnedComment,
        publishAt,
        postBufferSec: 900,
      });
      commentQueued = true;
      console.log("[short:upload] コメント予約 — 公開15分後に patrol が投稿");
    } else {
      try {
        const c = await postTopComment(result.videoId, draft.pinnedComment);
        commentId = c.id ?? null;
        console.log("[short:upload] コメント投稿 OK（ピン留めは Studio で手動）");
      } catch (e) {
        console.warn("[short:upload] コメント投稿スキップ:", e instanceof Error ? e.message : e);
      }
    }
  }

  const relVideo = path.relative(root, videoPath).replace(/\\/g, "/");
  const resultDir = fileArg
    ? path.join(root, path.dirname(relVideo))
    : outDir;
  await mkdir(resultDir, { recursive: true });
  const resultPath = path.join(resultDir, "youtube-upload-result.json");
  const payload = {
    slug,
    uploadedAt: new Date().toISOString(),
    visibility: publishAt ? "scheduled" : visibility,
    publishAt: publishAt ?? result.publishAt ?? null,
    commentQueued,
    ...result,
    commentId,
    pinNote: publishAt
      ? "公開15分後にコメント自動投稿（patrol）→ Studio でピン留め"
      : "コメントのピン留めは YouTube Studio で手動",
  };
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[short:upload] log → ${path.relative(root, resultPath)}`);
}

main().catch((e) => {
  console.error("[short:upload]", e instanceof Error ? e.message : e);
  process.exit(1);
});
