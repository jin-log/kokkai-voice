/**
 * 予約公開 Shorts — 公開後にコメントを投稿するキュー
 * data/youtube-pending-comments.json
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findChannelPinnedComment,
  getVideoStatus,
  postTopComment,
} from "./youtube-upload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const QUEUE_PATH = path.join(root, "data/youtube-pending-comments.json");

/** 公開時刻からこの秒数後にコメント試行（既定5分） */
export const POST_BUFFER_SEC = 300;
export const MAX_ATTEMPTS = 60;
const VERIFY_LINK_HINT = "seiji1192.site";

/** @typedef {{
 *   videoId: string;
 *   slug: string;
 *   commentText: string;
 *   publishAt: string;
 *   postAfter: string;
 *   createdAt: string;
 *   status: 'pending'|'posted'|'failed';
 *   commentId?: string|null;
 *   commentThreadId?: string|null;
 *   postedAt?: string|null;
 *   lastAttemptAt?: string|null;
 *   lastError?: string|null;
 *   verifiedAt?: string|null;
 *   attempts: number;
 * }} PendingCommentItem */

/** @returns {Promise<{ items: PendingCommentItem[]; updatedAt?: string }>} */
export async function loadPendingComments() {
  try {
    const raw = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
    return { items: Array.isArray(raw.items) ? raw.items : [], updatedAt: raw.updatedAt };
  } catch {
    return { items: [] };
  }
}

/** @param {PendingCommentItem[]} items */
export async function savePendingComments(items) {
  await mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await writeFile(
    QUEUE_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2)}\n`,
    "utf8",
  );
}

/**
 * @param {{
 *   videoId: string;
 *   slug: string;
 *   commentText: string;
 *   publishAt: string;
 *   postBufferSec?: number;
 * }} input
 */
export async function enqueuePendingComment(input) {
  const { items } = await loadPendingComments();
  const publishMs = new Date(input.publishAt).getTime();
  const bufferSec = input.postBufferSec ?? POST_BUFFER_SEC;
  const postAfter = new Date(publishMs + bufferSec * 1000).toISOString();

  const existing = items.find(
    (i) => i.videoId === input.videoId && i.status !== "failed",
  );
  if (existing) {
    if (existing.status === "posted") return existing;
    existing.commentText = input.commentText;
    existing.publishAt = input.publishAt;
    existing.postAfter = postAfter;
    existing.slug = input.slug;
    await savePendingComments(items);
    return existing;
  }

  /** @type {PendingCommentItem} */
  const item = {
    videoId: input.videoId,
    slug: input.slug,
    commentText: input.commentText,
    publishAt: input.publishAt,
    postAfter,
    createdAt: new Date().toISOString(),
    status: "pending",
    commentId: null,
    attempts: 0,
  };
  items.push(item);
  await savePendingComments(items);
  return item;
}

/**
 * @param {PendingCommentItem} item
 * @param {{ force?: boolean }} [opts]
 */
export async function tryPostPendingComment(item, opts = {}) {
  const now = Date.now();
  const postAfterMs = new Date(item.postAfter).getTime();
  if (!opts.force && now < postAfterMs) {
    return { ok: false, skipped: true, reason: "before_post_after" };
  }
  if (item.status === "posted") {
    return { ok: true, skipped: true, reason: "already_posted", commentId: item.commentId };
  }
  if (item.attempts >= MAX_ATTEMPTS) {
    item.status = "failed";
    item.lastError = "max_attempts";
    return { ok: false, skipped: true, reason: "max_attempts" };
  }

  item.attempts += 1;
  item.lastAttemptAt = new Date().toISOString();

  try {
    const status = await getVideoStatus(item.videoId);
    if (status.privacyStatus !== "public" && !opts.force) {
      item.lastError = `not_public:${status.privacyStatus}`;
      return { ok: false, skipped: true, reason: item.lastError };
    }

    const res = await postTopComment(item.videoId, item.commentText);
    const threadId = res.id ?? null;
    const commentId = res.snippet?.topLevelComment?.id ?? threadId;

    // APIが成功を返しても反映漏れがあるので、一覧でリンク付きコメントを再確認
    await new Promise((r) => setTimeout(r, 2500));
    const verified = await findChannelPinnedComment(item.videoId, VERIFY_LINK_HINT);
    if (!verified) {
      item.lastError = "posted_api_ok_but_not_visible";
      if (item.attempts >= MAX_ATTEMPTS) item.status = "failed";
      return {
        ok: false,
        error: "コメントAPIは成功したが動画上にリンク付きコメントが見つからない",
        commentId,
      };
    }

    item.status = "posted";
    item.commentId = verified.commentId ?? commentId;
    item.commentThreadId = verified.commentThreadId ?? threadId;
    item.postedAt = new Date().toISOString();
    item.lastError = null;
    item.verifiedAt = new Date().toISOString();
    return {
      ok: true,
      commentId: item.commentId,
      commentThreadId: item.commentThreadId,
      verified: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    item.lastError = msg.slice(0, 500);
    if (item.attempts >= MAX_ATTEMPTS) item.status = "failed";
    return { ok: false, error: msg };
  }
}

/**
 * @param {{ log?: (msg: string) => void|Promise<void>; force?: boolean }} [opts]
 */
export async function processPendingComments(opts = {}) {
  const log = opts.log ?? ((m) => console.log(m));
  const { items } = await loadPendingComments();
  /** @type {string[]} */
  const actions = [];
  /** @type {string[]} */
  const alerts = [];

  for (const item of items) {
    if (item.status === "posted") continue;
    if (item.status === "failed" && !opts.force) continue;

    const result = await tryPostPendingComment(item, { force: opts.force });
    if (result.skipped && result.reason === "before_post_after") continue;
    if (result.skipped && result.reason?.startsWith("not_public")) continue;
    if (result.ok && !result.skipped) {
      actions.push(`${item.slug}:${item.videoId}`);
      await log(
        `youtube-comment: posted+verified ${item.slug} (${item.videoId}) commentId=${result.commentId}`,
      );
    } else if (!result.ok && !result.skipped) {
      alerts.push(`${item.slug}: ${result.error?.slice(0, 120) ?? "error"}`);
      await log(`youtube-comment: retry ${item.slug} attempt ${item.attempts}`);
      if (item.status === "failed") {
        alerts.push(`${item.slug}: FAILED after ${item.attempts} attempts — ${item.lastError}`);
        await log(`youtube-comment: FAILED ${item.slug} (${item.videoId})`);
      }
    }
  }

  await savePendingComments(items);
  return {
    pending: items.filter((i) => i.status === "pending").length,
    posted: items.filter((i) => i.status === "posted").length,
    failed: items.filter((i) => i.status === "failed").length,
    actions,
    alerts,
    needsPush: actions.length > 0,
  };
}
