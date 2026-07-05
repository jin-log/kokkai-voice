/**
 * 予約プロモ — X / note 更新告知（postAfter 以降に marketing-patrol が実行）
 * data/promo-scheduled-queue.json
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../../src/lib/articles.mjs";
import { formatXUpdatePost } from "../../src/lib/promo-generate.mjs";
import {
  loadBufferApiKeyAsync,
  loadBufferChannelId,
  resolveTwitterChannel,
  createXPost,
} from "../../src/lib/buffer-api.mjs";
import { recordBufferPost } from "../../src/lib/buffer-status.mjs";
import { recordArticleActivity } from "../../src/lib/article-activity.mjs";
import { readXPostLog, writeXPostLog, todayJst } from "../../src/lib/x-post-log.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const QUEUE_PATH = path.join(root, "data/promo-scheduled-queue.json");
export const POST_BUFFER_SEC = 0;

/** @typedef {{
 *   id: string;
 *   slug: string;
 *   kind: 'update';
 *   channels: ('x'|'note')[];
 *   postAfter: string;
 *   createdAt: string;
 *   status: 'pending'|'done'|'failed';
 *   results?: { x?: { ok: boolean; at?: string; postId?: string; error?: string }; note?: { ok: boolean; at?: string; url?: string; error?: string } };
 *   attempts?: number;
 *   lastError?: string|null;
 * }} ScheduledPromoItem */

/** @returns {Promise<{ items: ScheduledPromoItem[] }>} */
export async function loadPromoScheduledQueue() {
  try {
    const raw = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
    return { items: Array.isArray(raw.items) ? raw.items : [] };
  } catch {
    return { items: [] };
  }
}

/** @param {ScheduledPromoItem[]} items */
export async function savePromoScheduledQueue(items) {
  await mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await writeFile(
    QUEUE_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2)}\n`,
    "utf8",
  );
}

/**
 * @param {{
 *   id?: string;
 *   slug: string;
 *   channels: ('x'|'note')[];
 *   postAfter: string;
 *   kind?: 'update';
 * }} input
 */
export async function enqueuePromoScheduled(input) {
  const { items } = await loadPromoScheduledQueue();
  const id = input.id ?? `${input.slug}-update-${input.postAfter.slice(0, 10)}`;
  const existing = items.find((i) => i.id === id);
  if (existing && existing.status !== "failed") {
    existing.channels = [...new Set([...existing.channels, ...input.channels])];
    existing.postAfter = input.postAfter;
    await savePromoScheduledQueue(items);
    return existing;
  }

  /** @type {ScheduledPromoItem} */
  const item = {
    id,
    slug: input.slug,
    kind: input.kind ?? "update",
    channels: input.channels,
    postAfter: input.postAfter,
    createdAt: new Date().toISOString(),
    status: "pending",
    results: {},
    attempts: 0,
  };
  items.push(item);
  await savePromoScheduledQueue(items);
  return item;
}

/** @param {ScheduledPromoItem} item */
async function postXUpdate(item) {
  if (item.results?.x?.ok) return { ok: true, skipped: true };

  const apiKey = await loadBufferApiKeyAsync();
  if (!apiKey) throw new Error("BUFFER_API_KEY 未設定");

  const article = await loadArticle(item.slug);
  const text = formatXUpdatePost(article);
  const channelId = loadBufferChannelId();
  const resolved = await resolveTwitterChannel(apiKey, channelId || undefined);
  if (!resolved.ok) throw new Error(resolved.message);

  const post = await createXPost(apiKey, {
    channelId: resolved.channel.id,
    text,
  });

  const log = await readXPostLog();
  log.updates = log.updates ?? [];
  log.updates.push({
    id: item.id,
    slug: item.slug,
    date: todayJst(),
    postedAt: new Date().toISOString(),
    postId: post.id,
  });
  await writeXPostLog(log);
  await recordBufferPost({ slug: `${item.slug}:update`, ok: true, postId: post.id });
  await recordArticleActivity({
    slug: item.slug,
    type: "promo.x.update",
    actor: "promo",
    detail: `X更新告知 ${post.id}`,
  });

  item.results = item.results ?? {};
  item.results.x = { ok: true, at: new Date().toISOString(), postId: post.id };
  return { ok: true, postId: post.id };
}

/** @param {ScheduledPromoItem} item */
async function postNoteUpdate(item) {
  if (item.results?.note?.ok) return { ok: true, skipped: true };

  const script = path.join(root, "scripts/post-note-article.mjs");
  const r = spawnSync(process.execPath, [script, "--slug", item.slug, "--update"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "note 投稿失敗").trim().slice(0, 300));
  }

  const m = (r.stdout || "").match(/OK note: (https:\/\/[^\s]+)/);
  const url = m?.[1] ?? null;
  item.results = item.results ?? {};
  item.results.note = { ok: true, at: new Date().toISOString(), url };
  await recordArticleActivity({
    slug: item.slug,
    type: "promo.note.update",
    actor: "promo",
    detail: url ? `note更新告知 ${url}` : "note更新告知",
  });
  return { ok: true, url };
}

/** @param {ScheduledPromoItem} item */
async function processItem(item) {
  const now = Date.now();
  if (now < new Date(item.postAfter).getTime()) {
    return { skipped: true, reason: "before_post_after" };
  }

  item.attempts = (item.attempts ?? 0) + 1;
  /** @type {string[]} */
  const done = [];

  for (const ch of item.channels) {
    if (ch === "x" && !item.results?.x?.ok) {
      await postXUpdate(item);
      done.push("x");
    }
    if (ch === "note" && !item.results?.note?.ok) {
      await postNoteUpdate(item);
      done.push("note");
    }
  }

  const allOk = item.channels.every((ch) => item.results?.[ch]?.ok);
  item.status = allOk ? "done" : "pending";
  if (!allOk && (item.attempts ?? 0) >= 30) {
    item.status = "failed";
    item.lastError = "max_attempts";
  }

  return { ok: allOk, done };
}

/**
 * @param {{ log?: (msg: string) => void|Promise<void> }} [opts]
 */
export async function processPromoScheduledQueue(opts = {}) {
  const log = opts.log ?? ((m) => console.log(m));
  const { items } = await loadPromoScheduledQueue();
  /** @type {string[]} */
  const actions = [];
  /** @type {string[]} */
  const alerts = [];

  for (const item of items) {
    if (item.status === "done") continue;
    if (item.status === "failed") continue;

    try {
      const result = await processItem(item);
      if (result.skipped) continue;
      if (result.done?.length) {
        actions.push(`${item.slug}:${result.done.join("+")}`);
        await log(`promo-scheduled: ${item.slug} ${result.done.join("+")}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      item.lastError = msg.slice(0, 500);
      alerts.push(`${item.slug}: ${msg.slice(0, 120)}`);
      await log(`promo-scheduled: retry ${item.slug} — ${msg.slice(0, 80)}`);
    }
  }

  await savePromoScheduledQueue(items);
  return {
    pending: items.filter((i) => i.status === "pending").length,
    done: items.filter((i) => i.status === "done").length,
    failed: items.filter((i) => i.status === "failed").length,
    actions,
    alerts,
    needsPush: actions.length > 0,
  };
}

/** @param {string} raw HH:MM or ISO */
export function parsePromoPostAfter(raw) {
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hh, mm] = raw.split(":").map(Number);
    const jst = new Date(Date.now() + 9 * 3600000);
    jst.setUTCHours(hh - 9, mm, 0, 0);
    if (jst.getTime() <= Date.now() + 60_000) {
      throw new Error(`--at ${raw} は過去または1分以内です`);
    }
    return jst.toISOString();
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`--at の形式が不正: ${raw}`);
  return d.toISOString();
}
