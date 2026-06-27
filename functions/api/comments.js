import { json, jsonError } from "../lib/http.js";
import { visitorHash } from "../lib/visitor-hash.js";
import { verifyTurnstile } from "../lib/turnstile.js";

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
      `SELECT id, author_name, body, created_at
       FROM comments
       WHERE case_slug = ? AND status = 'approved'
       ORDER BY created_at ASC
       LIMIT 200`,
    )
    .bind(slug)
    .all();

  return json({
    ok: true,
    slug,
    comments: (results ?? []).map(rowToComment),
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

  if (!slug || !SLUG_RE.test(slug)) return jsonError("slug が不正です", 400);
  if (!body || body.length > MAX_BODY) return jsonError("コメントは1〜500文字", 400);

  const ip = context.request.headers.get("CF-Connecting-IP");
  const turnstileOk = await verifyTurnstile({
    secret: context.env.TURNSTILE_SECRET_KEY,
    token,
    ip,
  });
  if (!turnstileOk) return jsonError("認証に失敗しました。再読み込みしてください。", 403);

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
      `INSERT INTO comments (id, case_slug, author_name, body, status, visitor_hash, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(id, slug, name, body, hash, createdAt)
    .run();

  return json({ ok: true, id, status: "pending" }, 201);
}

/** @param {Record<string, unknown>} row */
function rowToComment(row) {
  return {
    id: row.id,
    name: row.author_name,
    body: row.body,
    at: row.created_at,
  };
}

/** @param {unknown} raw */
function sanitizeName(raw) {
  const name = String(raw ?? "").trim().slice(0, MAX_NAME);
  return name || "匿名";
}
