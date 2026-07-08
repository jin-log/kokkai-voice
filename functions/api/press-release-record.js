/**
 * POST /api/press-release-record
 * body: { pin, channelId, publishedUrl? }
 */
import { decodeGitHubBase64Utf8 } from "../lib/github-content.js";

const REPO = "jin-log/kokkai-voice";
const LOG_PATH = "data/promo-intro-log.json";

export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { pin, channelId, publishedUrl } = body;
  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!GH_TOKEN) {
    return json({ error: "GH_TOKEN 未設定" }, 500);
  }
  if (!channelId?.trim()) {
    return json({ error: "channelId は必須です" }, 400);
  }

  try {
    const meta = await ghGetFile(GH_TOKEN, LOG_PATH);
    const log = JSON.parse(decodeGitHubBase64Utf8(meta.content));
    log.pressReleases = log.pressReleases ?? {};
    log.pressReleases[channelId.trim()] = {
      postedAt: new Date().toISOString(),
      publishedUrl: publishedUrl?.trim() || log.pressReleases[channelId.trim()]?.publishedUrl || "",
    };
    await ghPutFile(
      GH_TOKEN,
      LOG_PATH,
      meta.sha,
      `${JSON.stringify(log, null, 2)}\n`,
      `pr: record ${channelId.trim()}`,
    );
    return json({ ok: true, channelId: channelId.trim(), record: log.pressReleases[channelId.trim()] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
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
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kokkai-voice-pages/1.0",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
