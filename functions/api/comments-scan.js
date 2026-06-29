import { json, jsonError } from "../lib/http.js";
import { scanCommentLegal } from "../lib/comment-legal.mjs";

/** POST /api/comments-scan — 入力中チェック（理由は返さない） */
export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonError("JSON が不正です", 400);
  }

  const name = String(payload.name ?? "").trim().slice(0, 32);
  const body = String(payload.body ?? "").trim();
  const ok = scanCommentLegal(`${name}\n${body}`).ok;

  return json({ ok });
}
