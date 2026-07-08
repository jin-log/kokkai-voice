/**
 * POST /api/article-recommendations
 * body: { pin, slug, nextReads?, midReads?, prerequisiteRead? }
 */
import { decodeGitHubBase64Utf8 } from "../lib/github-content.js";

const REPO = "jin-log/kokkai-voice";

export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { pin, slug, nextReads, midReads, prerequisiteRead } = body;
  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!GH_TOKEN) {
    return json({ error: "GH_TOKEN 未設定" }, 500);
  }
  if (!slug?.trim()) {
    return json({ error: "slug は必須です" }, 400);
  }

  const filePath = `data/articles/${slug.trim()}.json`;

  try {
    const meta = await ghGetFile(GH_TOKEN, filePath);
    const article = JSON.parse(decodeGitHubBase64Utf8(meta.content));

    if (nextReads !== undefined) {
      article.nextReads = sanitizeReads(nextReads);
    }
    if (midReads !== undefined) {
      article.midReads = sanitizeReads(midReads);
    }
    if (prerequisiteRead !== undefined) {
      article.prerequisiteRead = sanitizePrereq(prerequisiteRead);
    }

    await ghPutFile(
      GH_TOKEN,
      filePath,
      meta.sha,
      `${JSON.stringify(article, null, 2)}\n`,
      `rec: update ${slug.trim()} recommendations`,
    );

    return json({
      ok: true,
      slug: slug.trim(),
      nextReads: article.nextReads ?? [],
      midReads: article.midReads ?? [],
      prerequisiteRead: article.prerequisiteRead ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
}

function sanitizeReads(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      slug: String(r?.slug || "").trim(),
      headline: String(r?.headline || "").trim() || undefined,
      kicker: String(r?.kicker || "").trim() || undefined,
    }))
    .filter((r) => r.slug)
    .slice(0, 5);
}

function sanitizePrereq(row) {
  if (!row || !row.slug) return null;
  return {
    slug: String(row.slug).trim(),
    label: String(row.label || "前提知識").trim(),
    headline: String(row.headline || "").trim() || undefined,
  };
}

async function ghGetFile(token, filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=main`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) throw new Error(`GitHub read ${filePath}: ${res.status}`);
  return res.json();
}

async function ghPutFile(token, filePath, sha, content, message) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: "main",
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub write ${filePath}: ${res.status} ${detail}`);
  }
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "kokkai-voice-api",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
