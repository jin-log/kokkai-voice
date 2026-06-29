import { json, jsonError } from "../lib/http.js";

/** @param {import("@cloudflare/workers-types").EventContext<any, any, any>} context */
export async function onRequestGet(context) {
  if (!authorize(context)) return jsonError("unauthorized", 401);

  const db = context.env.DB;
  if (!db) return jsonError("コメントDB未設定（D1バインディング）", 503);

  const url = new URL(context.request.url);
  const status = url.searchParams.get("status") || "pending";
  const slug = url.searchParams.get("slug")?.trim();

  if (status === "reported") {
    const { results } = await db
      .prepare(
        `SELECT c.id, c.case_slug, c.author_name, c.body, c.status, c.created_at,
                COUNT(r.id) AS report_count,
                MAX(r.created_at) AS last_report_at
         FROM comments c
         INNER JOIN comment_reports r ON r.comment_id = c.id
         WHERE c.status = 'approved'
         GROUP BY c.id
         ORDER BY report_count DESC, last_report_at DESC
         LIMIT 200`,
      )
      .all();
    const rows = results ?? [];
    return json({
      ok: true,
      status: "reported",
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        slug: row.case_slug,
        name: row.author_name,
        body: row.body,
        status: row.status,
        at: row.created_at,
        reportCount: Number(row.report_count ?? 0),
        lastReportAt: row.last_report_at,
      })),
    });
  }

  if (status === "summary") {
    const reported = await db
      .prepare(
        `SELECT COUNT(DISTINCT c.id) AS n
         FROM comments c
         INNER JOIN comment_reports r ON r.comment_id = c.id
         WHERE c.status = 'approved'`,
      )
      .first();
    const approved = await db
      .prepare(`SELECT COUNT(*) AS n FROM comments WHERE status = 'approved'`)
      .first();
    const rejected = await db
      .prepare(`SELECT COUNT(*) AS n FROM comments WHERE status = 'rejected'`)
      .first();
    const reportsTotal = await db
      .prepare(`SELECT COUNT(*) AS n FROM comment_reports`)
      .first();
    return json({
      ok: true,
      reported: Number(reported?.n ?? 0),
      approved: Number(approved?.n ?? 0),
      rejected: Number(rejected?.n ?? 0),
      reportsTotal: Number(reportsTotal?.n ?? 0),
    });
  }

  let stmt;
  if (slug) {
    stmt = db
      .prepare(
        `SELECT id, case_slug, author_name, body, status, created_at
         FROM comments
         WHERE status = ? AND case_slug = ?
         ORDER BY created_at DESC
         LIMIT 100`,
      )
      .bind(status, slug);
  } else {
    stmt = db
      .prepare(
        `SELECT id, case_slug, author_name, body, status, created_at
         FROM comments
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT 200`,
      )
      .bind(status);
  }

  const { results } = await stmt.all();
  const rows = results ?? [];

  return json({
    ok: true,
    status,
    count: rows.length,
    items: rows.map((row) => ({
      id: row.id,
      slug: row.case_slug,
      name: row.author_name,
      body: row.body,
      status: row.status,
      at: row.created_at,
    })),
  });
}

/** @param {import("@cloudflare/workers-types").EventContext<any, any, any>} context */
export async function onRequestPost(context) {
  if (!authorize(context)) return jsonError("unauthorized", 401);

  const db = context.env.DB;
  if (!db) return jsonError("コメントDB未設定（D1バインディング）", 503);

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonError("JSON が不正です", 400);
  }

  const id = String(payload.id ?? "").trim();
  const action = String(payload.action ?? "").trim();

  if (!id) return jsonError("id が必要です", 400);
  if (!["approve", "reject", "hide"].includes(action)) return jsonError("action が不正です", 400);

  const status = action === "approve" ? "approved" : "rejected";
  const moderatedAt = new Date().toISOString();
  const fromStatus = action === "hide" ? "approved" : "pending";

  const result = await db
    .prepare(
      `UPDATE comments SET status = ?, moderated_at = ?
       WHERE id = ? AND status = ?`,
    )
    .bind(status, moderatedAt, id, fromStatus)
    .run();

  if (!result.meta.changes) return jsonError("対象が見つからないか、処理済みです", 404);

  return json({ ok: true, id, status });
}

/** @param {import("@cloudflare/workers-types").EventContext<any, any, any>} context */
function authorize(context) {
  const { ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin") || context.request.headers.get("x-admin-pin");
  return Boolean(ADMIN_PIN && pin === ADMIN_PIN);
}
