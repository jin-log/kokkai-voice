import { json, jsonError } from "../lib/http.js";
import { visitorHash } from "../lib/visitor-hash.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { scanCommentLegal } from "../lib/comment-legal.mjs";
import { myReactions, reactionCounts } from "./comments-react.js";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const MAX_BODY = 500;
const MAX_NAME = 32;
const RATE_LIMIT_PER_DAY = 5;

/** @param {import("@cloudflare/workers-types").EventContext<any, any, any>} context */
export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return jsonError("コメントDB未設定（D1バインディング）", 503);

  const slug = new URL(context.request.url).searchParams.get("slug")?.trim();
  if (!slug || !SLUG_RE.test(slug)) return jsonError("slug が不正です", 400);

  const { results } = await db
    .prepare(
      `SELECT id, author_name, body, created_at, parent_id
       FROM comments
       WHERE case_slug = ? AND status = 'approved'
       ORDER BY created_at ASC
       LIMIT 300`,
    )
    .bind(slug)
    .all();

  const rows = results ?? [];
  const ids = rows.map((r) => String(r.id));
  const hash = await visitorHash(context.request);
  const [counts, mine] = await Promise.all([
    reactionCounts(db, ids),
    myReactions(db, ids, hash),
  ]);

  return json({
    ok: true,
    slug,
    comments: rows.map((row) => rowToComment(row, counts, mine)),
  });
}

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

  const slug = String(payload.slug ?? "").trim();
  const name = sanitizeName(payload.name);
  const body = String(payload.body ?? "").trim();
  const token = String(payload.turnstileToken ?? "");
  const parentId = payload.parentId ? String(payload.parentId).trim() : null;

  if (!slug || !SLUG_RE.test(slug)) return jsonError("slug が不正です", 400);
  if (!body || body.length > MAX_BODY) return jsonError("コメントは1〜500文字", 400);

  if (payload.acceptedTerms !== true) {
    return jsonError("コメント投稿規約への同意が必要です。", 403);
  }

  if (!scanCommentLegal(`${name}\n${body}`).ok) {
    return jsonError("投稿できない内容が含まれています。", 403);
  }

  const isReply = Boolean(parentId);
  if (isReply) {
    const parent = await db
      .prepare(`SELECT id, case_slug, parent_id FROM comments WHERE id = ? AND status = 'approved'`)
      .bind(parentId)
      .first();
    if (!parent || parent.case_slug !== slug) {
      return jsonError("返信先が見つかりません", 400);
    }
    if (parent.parent_id) {
      return jsonError("返信の返信はできません（1階層まで）", 400);
    }
  } else {
    const ip = context.request.headers.get("CF-Connecting-IP");
    const turnstileOk = await verifyTurnstile({
      secret: context.env.TURNSTILE_SECRET_KEY,
      token,
      ip,
    });
    if (!turnstileOk) return jsonError("認証に失敗しました。再読み込みしてください。", 403);
  }

  const hash = await visitorHash(context.request);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rate = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM comments
       WHERE visitor_hash = ? AND created_at >= ?`,
    )
    .bind(hash, since)
    .first();

  if (Number(rate?.n ?? 0) >= RATE_LIMIT_PER_DAY) {
    return jsonError("投稿上限に達しました。24時間後に再試行してください。", 429);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO comments (id, case_slug, author_name, body, status, visitor_hash, created_at, parent_id)
       VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)`,
    )
    .bind(id, slug, name, body, hash, createdAt, parentId)
    .run();

  return json({ ok: true, id, status: "approved", parentId }, 201);
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, { good: number; bad: number }>} counts
 * @param {Record<string, string>} mine
 */
function rowToComment(row, counts, mine) {
  const id = String(row.id);
  return {
    id,
    name: row.author_name,
    body: row.body,
    at: row.created_at,
    parentId: row.parent_id ?? null,
    good: counts[id]?.good ?? 0,
    bad: counts[id]?.bad ?? 0,
    myReaction: mine[id] ?? null,
  };
}

/** @param {unknown} raw */
function sanitizeName(raw) {
  const name = String(raw ?? "").trim().slice(0, MAX_NAME);
  return name || "匿名";
}
