/**
 * 記事ごとの外部紹介状態（X / はてブ / note）
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readXPostLog } from "./x-post-log.mjs";
import { recordArticleActivity } from "./article-activity.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INTRO_LOG = path.join(root, "data/promo-intro-log.json");
const BUFFER_POST_LOG = path.join(root, "data/buffer-post-log.json");
const BUFFER_STATUS = path.join(root, "data/buffer-status.json");

const EMPTY = { x: null, hatena: null, note: null };

export async function loadPromoIntroLog() {
  try {
    return JSON.parse(await readFile(INTRO_LOG, "utf8"));
  } catch {
    return { hatena: {}, note: {}, noteSiteIntroAt: null };
  }
}

/** @param {string} slug @param {"hatena"|"note"} channel */
export async function recordPromoIntro(slug, channel) {
  const log = await loadPromoIntroLog();
  const at = new Date().toISOString();
  log[channel] = log[channel] ?? {};
  log[channel][slug] = at;
  await mkdir(path.dirname(INTRO_LOG), { recursive: true });
  await writeFile(INTRO_LOG, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  await recordArticleActivity({
    slug,
    type: channel === "hatena" ? "promo.hatena" : "promo.note",
    actor: "promo",
    detail: `${channel} 投稿完了`,
  });
  return at;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

/** @returns {Promise<Map<string, { x: string|null, hatena: string|null, note: string|null }>>} */
export async function buildPromoIntroMap() {
  const map = new Map();
  const ensure = (slug) => {
    if (!map.has(slug)) map.set(slug, { ...EMPTY });
    return map.get(slug);
  };

  const introLog = await loadPromoIntroLog();
  for (const [slug, at] of Object.entries(introLog.hatena ?? {})) {
    ensure(slug).hatena = at;
  }
  for (const [slug, at] of Object.entries(introLog.note ?? {})) {
    ensure(slug).note = at;
  }

  const bufferLog = await readJson(BUFFER_POST_LOG);
  if (bufferLog && typeof bufferLog === "object") {
    for (const [slug, at] of Object.entries(bufferLog)) {
      if (typeof at === "string") ensure(slug).x = at;
    }
  }

  const bufferStatus = await readJson(BUFFER_STATUS);
  for (const p of bufferStatus?.recentPosts ?? []) {
    if (p.slug && p.ok) {
      const row = ensure(p.slug);
      if (!row.x || p.at > row.x) row.x = p.at;
    }
  }

  const xLog = await readXPostLog();
  for (const d of xLog.digest ?? []) {
    for (const slug of d.slugs ?? []) {
      const row = ensure(slug);
      if (!row.x || d.postedAt > row.x) row.x = d.postedAt;
    }
  }
  for (const h of xLog.hot ?? []) {
    if (!h.slug) continue;
    const row = ensure(h.slug);
    if (!row.x || h.postedAt > row.x) row.x = h.postedAt;
  }

  return map;
}

/** @param {{ x: string|null, hatena: string|null, note: string|null }} promo */
export function promoIntroSummary(promo) {
  const done = [promo.x, promo.hatena, promo.note].filter(Boolean).length;
  return { done, total: 3, complete: done === 3 };
}

/** @param {string|null} iso */
export function promoDateShort(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
