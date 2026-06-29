import { json, jsonError } from "../lib/http.js";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;

/** POST /api/comments-report — 通報（コメント非表示は管理画面から） */
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
  if (!commentId || !slug || !SLUG_RE.test(slug)) {
    return jsonError("パラメータが不正です", 400);
  }

  const exists = await db
    .prepare(`SELECT id FROM comments WHERE id = ? AND case_slug = ? AND status = 'approved'`)
    .bind(commentId, slug)
    .first();
  if (!exists) return jsonError("コメントが見つかりません", 404);

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO comment_reports (id, comment_id, case_slug, created_at) VALUES (?, ?, ?, ?)`,
    )
    .bind(id, commentId, slug, new Date().toISOString())
    .run();

  return json({ ok: true });
}
