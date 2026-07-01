/**
 * 記事の公開・非表示・巡回・発信の操作履歴
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOG_PATH = path.join(root, "data/article-activity.json");
const MAX_EVENTS = 4000;
const MAX_PER_SLUG = 40;

/** @type {Record<string, string>} */
export const ACTIVITY_LABELS = {
  "patrol.start": "巡回処理開始",
  "patrol.done": "巡回処理完了",
  "gate.ready": "公開ゲート到達（まだ非公開）",
  "publish.manual": "手動で一般公開",
  "hide.manual": "手動で非表示",
  "hide.batch": "一括投入で非表示",
  "unhide.manual": "表示に戻した",
  "promo.queue": "発信キューに登録",
  "promo.x": "X投稿済み",
  "promo.hatena": "はてブ投稿済み",
  "promo.note": "note投稿済み",
  "promo.short.generated": "ショート動画生成",
  "promo.short.uploaded": "YouTubeアップ",
  "quality.ng": "品質NGを検出",
  "quality.ok": "品質OKに回復",
};

/** @returns {Promise<{ version: number, events: ActivityEvent[] }>} */
export async function loadActivityLog() {
  try {
    const raw = JSON.parse(await readFile(LOG_PATH, "utf8"));
    return {
      version: raw.version ?? 1,
      events: Array.isArray(raw.events) ? raw.events : [],
    };
  } catch {
    return { version: 1, events: [] };
  }
}

/**
 * @typedef {{ id: string, slug: string, at: string, type: string, actor: string, detail?: string, meta?: Record<string, unknown> }} ActivityEvent
 */

/**
 * @param {{ slug: string, type: keyof typeof ACTIVITY_LABELS | string, actor?: string, detail?: string, meta?: Record<string, unknown> }} input
 */
export async function recordArticleActivity(input) {
  const { slug, type, actor = "system", detail, meta } = input;
  const log = await loadActivityLog();
  const at = new Date().toISOString();
  const event = {
    id: `${at}-${slug}-${type}`,
    slug,
    at,
    type,
    actor,
    ...(detail ? { detail } : {}),
    ...(meta ? { meta } : {}),
  };
  log.events.push(event);
  if (log.events.length > MAX_EVENTS) {
    log.events = log.events.slice(-MAX_EVENTS);
  }
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return event;
}

/** @param {string} slug @param {number} [limit] */
export async function getArticleActivity(slug, limit = 12) {
  const log = await loadActivityLog();
  return log.events
    .filter((e) => e.slug === slug)
    .slice(-limit)
    .reverse();
}

/** @param {ActivityEvent} e */
  const log = await loadActivityLog();
  const has = (type) => log.events.some((e) => e.slug === slug && e.type === type);
  /** @type {ActivityEvent[]} */
  const added = [];

  if (article.publishedAt && !has("publish.manual")) {
    added.push({
      id: `backfill-${slug}-publish`,
      slug,
      at: article.publishedAt,
      type: "publish.manual",
      actor: article.publishedBy ?? "owner",
      detail: "履歴補完（公開日時から）",
    });
  }
  if (article.adminHiddenAt && !has("hide.manual") && !has("hide.batch")) {
    added.push({
      id: `backfill-${slug}-hide`,
      slug,
      at: article.adminHiddenAt,
      type: article.adminHiddenBy === "batch" ? "hide.batch" : "hide.manual",
      actor: article.adminHiddenBy ?? "owner",
      detail: "履歴補完（非表示日時から）",
    });
  }

  if (!added.length) return log;

  log.events.push(...added);
  if (log.events.length > MAX_EVENTS) {
    log.events = log.events.slice(-MAX_EVENTS);
  }
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return log;
}

/** @param {ActivityEvent} e */
export function formatActivityLine(e) {
  const label = ACTIVITY_LABELS[e.type] ?? e.type;
  const who =
    e.actor === "owner"
      ? "あなた"
      : e.actor === "patrol"
        ? "巡回"
        : e.actor === "batch"
          ? "一括投入"
          : e.actor === "promo"
            ? "発信"
            : e.actor;
  const tail = e.detail ? ` — ${e.detail}` : "";
  return `${label}（${who}）${tail}`;
}

/** @param {string} iso */
export function activityWhenShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}
