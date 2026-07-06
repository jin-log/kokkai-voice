/**
 * 公開済み Shorts にチャンネルコメント（質問＋サイトURL）を投稿
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../../src/lib/articles.mjs";
import { buildYoutubeUploadDraft } from "./youtube-upload-draft.mjs";
import {
  findChannelPinnedComment,
  getVideoStatus,
  postTopComment,
} from "./youtube-upload.mjs";
import { enqueuePendingComment, loadPendingComments, savePendingComments } from "./youtube-pending-comments.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const OUTPUT_SHORTS = path.join(root, "output/shorts");

/** @returns {Promise<Array<{ slug: string; videoId: string; resultPath: string; publishAt?: string|null }>>} */
export async function collectUploadedShorts() {
  /** @type {Array<{ slug: string; videoId: string; resultPath: string; publishAt?: string|null }>} */
  const out = [];
  let dirs = [];
  try {
    dirs = await readdir(OUTPUT_SHORTS);
  } catch {
    return out;
  }
  for (const slug of dirs) {
    const resultPath = path.join(OUTPUT_SHORTS, slug, "youtube-upload-result.json");
    try {
      const raw = JSON.parse(await readFile(resultPath, "utf8"));
      if (!raw.videoId) continue;
      out.push({
        slug,
        videoId: raw.videoId,
        resultPath,
        publishAt: raw.publishAt ?? raw.raw?.status?.publishAt ?? null,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

/**
 * @param {string} slug
 */
export async function buildCommentTextForSlug(slug) {
  const packPath = path.join(OUTPUT_SHORTS, slug, "youtube-upload.json");
  try {
    const pack = JSON.parse(await readFile(packPath, "utf8"));
    if (pack.pinnedComment) return pack.pinnedComment;
  } catch {
    /* fall through */
  }
  const article = await loadArticle(slug);
  return buildYoutubeUploadDraft(article).pinnedComment;
}

/**
 * @param {{ force?: boolean; onlyVideoId?: string; log?: (msg: string) => void|Promise<void> }} [opts]
 */
export async function backfillYoutubeComments(opts = {}) {
  const log = opts.log ?? ((m) => console.log(m));
  const uploads = await collectUploadedShorts();
  /** @type {string[]} */
  const posted = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {string[]} */
  const errors = [];

  for (const item of uploads) {
    if (opts.onlyVideoId && item.videoId !== opts.onlyVideoId) continue;
    try {
      const status = await getVideoStatus(item.videoId);
      if (status.privacyStatus !== "public" && !opts.force) {
        skipped.push(`${item.slug}: ${status.privacyStatus}`);
        continue;
      }

      const existing = await findChannelPinnedComment(item.videoId);
      if (existing) {
        skipped.push(`${item.slug}: already_has_comment`);
        const raw = JSON.parse(await readFile(item.resultPath, "utf8"));
        raw.commentId = existing.commentId;
        raw.commentThreadId = existing.commentThreadId;
        raw.commentedAt = raw.commentedAt ?? new Date().toISOString();
        await writeFile(item.resultPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
        continue;
      }

      const commentText = await buildCommentTextForSlug(item.slug);
      const res = await postTopComment(item.videoId, commentText);
      const commentThreadId = res.id ?? null;
      const commentId = res.snippet?.topLevelComment?.id ?? commentThreadId;

      const raw = JSON.parse(await readFile(item.resultPath, "utf8"));
      raw.commentId = commentId;
      raw.commentThreadId = commentThreadId;
      raw.commentedAt = new Date().toISOString();
      raw.pinNote = "公式APIにピン留めなし — Studioで手動ピン可";
      await writeFile(item.resultPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");

      posted.push(`${item.slug}:${item.videoId}`);
      await log(`youtube-comment: posted ${item.slug} (${item.videoId})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${item.slug}: ${msg.slice(0, 160)}`);
      await log(`youtube-comment: FAIL ${item.slug} — ${msg.slice(0, 120)}`);
    }
  }

  return { posted, skipped, errors };
}

/** 予約公開分を pending キューへ同期 */
export async function syncPendingCommentQueue() {
  const uploads = await collectUploadedShorts();
  for (const item of uploads) {
    const commentText = await buildCommentTextForSlug(item.slug);
    const publishAt = item.publishAt ?? new Date().toISOString();
    await enqueuePendingComment({
      videoId: item.videoId,
      slug: item.slug,
      commentText,
      publishAt,
    });
  }
  const { items } = await loadPendingComments();
  for (const item of items) {
    if (item.status !== "posted") continue;
    const upload = uploads.find((u) => u.videoId === item.videoId);
    if (!upload) continue;
    try {
      const existing = await findChannelPinnedComment(item.videoId);
      if (existing) continue;
      item.status = "pending";
      item.attempts = 0;
      item.lastError = "backfill_reset_missing_on_youtube";
    } catch {
      /* keep posted */
    }
  }
  await savePendingComments(items);
}
