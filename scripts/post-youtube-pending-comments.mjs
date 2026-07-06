#!/usr/bin/env node
/**
 * 予約公開 Shorts のコメントキューを処理
 *
 * Usage:
 *   npm run short:comment-pending
 *   npm run short:comment-pending -- --force --video-id UwHYlpVELbU
 */
import { processPendingComments, tryPostPendingComment, loadPendingComments, savePendingComments } from "./lib/youtube-pending-comments.mjs";
import { backfillYoutubeComments, syncPendingCommentQueue } from "./lib/youtube-comment-backfill.mjs";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const force = args.includes("--force");
const backfill = args.includes("--backfill");
const videoId = arg("--video-id");

async function main() {
  if (backfill) {
    await syncPendingCommentQueue();
    const result = await backfillYoutubeComments({ force, onlyVideoId: videoId ?? undefined });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length ? 1 : 0);
  }

  if (videoId) {
    const { items } = await loadPendingComments();
    const item = items.find((i) => i.videoId === videoId);
    if (!item) {
      console.error(`[short:comment-pending] キューに ${videoId} がありません`);
      process.exit(1);
    }
    const result = await tryPostPendingComment(item, { force });
    await savePendingComments(items);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  const result = await processPendingComments({ force });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.alerts.length && !result.actions.length ? 1 : 0);
}

main().catch((e) => {
  console.error("[short:comment-pending]", e instanceof Error ? e.message : e);
  process.exit(1);
});
