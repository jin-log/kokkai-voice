import { json, jsonError } from "../lib/http.js";
import { visitorHash } from "../lib/visitor-hash.js";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const REACTIONS = new Set(["good", "bad", "clear"]);

/** @param {import("@cloudflare/workers-types").EventContext<any, any, any>} context */
export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return jsonError("コメントDB未設定（D1バインディング）", 503);

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonError("JSON が不正です", 400);
  }

  const commentId = String(payload.commentId ?? "").trim();
  const slug = String(payload.slug ?? "").trim();
  const reaction = String(payload.reaction ?? "").trim();

  if (!commentId || !slug || !SLUG_RE.test(slug)) return jsonError("パラメータが不正です", 400);
  if (!REACTIONS.has(reaction)) return jsonError("reaction は good / bad / clear", 400);

  const row = await db
    .prepare(
      `SELECT id, case_slug FROM comments WHERE id = ? AND status = 'approved' LIMIT 1`,
    )
    .bind(commentId)
    .first();

  if (!row || row.case_slug !== slug) return jsonError("コメントが見つかりません", 404);

  const hash = await visitorHash(context.request);
  const now = new Date().toISOString();

  if (reaction === "clear") {
    await db
      .prepare(`DELETE FROM comment_reactions WHERE comment_id = ? AND visitor_hash = ?`)
      .bind(commentId, hash)
      .run();
    return json({ ok: true, commentId, myReaction: null });
  }

  await db
    .prepare(
      `INSERT INTO comment_reactions (comment_id, visitor_hash, reaction, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(comment_id, visitor_hash) DO UPDATE SET reaction = excluded.reaction, created_at = excluded.created_at`,
    )
    .bind(commentId, hash, reaction, now)
    .run();

  const counts = await reactionCounts(db, [commentId]);

  return json({
    ok: true,
    commentId,
    myReaction: reaction,
    good: counts[commentId]?.good ?? 0,
    bad: counts[commentId]?.bad ?? 0,
  });
}

/**
 * @param {D1Database} db
 * @param {string[]} ids
 */
export async function reactionCounts(db, ids) {
  if (!ids.length) return {};
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT comment_id, reaction, COUNT(*) AS n
       FROM comment_reactions
       WHERE comment_id IN (${placeholders})
       GROUP BY comment_id, reaction`,
    )
    .bind(...ids)
    .all();

  /** @type {Record<string, { good: number; bad: number }>} */
  const map = {};
  for (const row of results ?? []) {
    const id = String(row.comment_id);
    if (!map[id]) map[id] = { good: 0, bad: 0 };
    if (row.reaction === "good") map[id].good = Number(row.n ?? 0);
    if (row.reaction === "bad") map[id].bad = Number(row.n ?? 0);
  }
  return map;
}

/**
 * @param {D1Database} db
 * @param {string[]} ids
 * @param {string} hash
 */
export async function myReactions(db, ids, hash) {
  if (!ids.length || !hash) return {};
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT comment_id, reaction FROM comment_reactions
       WHERE visitor_hash = ? AND comment_id IN (${placeholders})`,
    )
    .bind(hash, ...ids)
    .all();

  /** @type {Record<string, string>} */
  const map = {};
  for (const row of results ?? []) {
    map[String(row.comment_id)] = String(row.reaction);
  }
  return map;
}
