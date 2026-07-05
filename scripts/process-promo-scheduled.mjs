#!/usr/bin/env node
/**
 * 予約プロモキュー — X / note 更新告知
 *
 * Usage:
 *   npm run promo:scheduled
 *   npm run promo:scheduled -- --enqueue case-mr0jbdpc --at 7:00 --channels x,note
 */
import {
  enqueuePromoScheduled,
  parsePromoPostAfter,
  processPromoScheduledQueue,
} from "./lib/promo-scheduled-queue.mjs";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--enqueue");
const at = arg("--at");
const channelsRaw = arg("--channels") || "x,note";

async function main() {
  if (slug && at) {
    const postAfter = parsePromoPostAfter(at);
    const channels = channelsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const item = await enqueuePromoScheduled({ slug, postAfter, channels });
    console.log(JSON.stringify({ enqueued: item }, null, 2));
    return;
  }

  const result = await processPromoScheduledQueue();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.alerts.length && !result.actions.length ? 1 : 0);
}

main().catch((e) => {
  console.error("[promo:scheduled]", e instanceof Error ? e.message : e);
  process.exit(1);
});
