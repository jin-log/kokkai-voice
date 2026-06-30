/**
 * GET /api/project-status?pin=1192
 * main の data/project-status.json を GitHub から取得（デプロイ不要で完成度をライブ更新）
 */
export async function onRequestGet(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!GH_TOKEN) {
    return json({ error: "GH_TOKEN 未設定" }, 500);
  }

  const apiUrl =
    "https://api.github.com/repos/jin-log/kokkai-voice/contents/data/project-status.json?ref=main";
  const res = await fetch(apiUrl, { headers: ghHeaders(GH_TOKEN) });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `GitHub API ${res.status}`, detail }, 500);
  }

  const meta = await res.json();
  if (!meta.content) {
    return json({ error: "empty content" }, 500);
  }

  const raw = atob(meta.content.replace(/\n/g, ""));
  /** @type {Record<string, unknown>} */
  let status;
  try {
    status = JSON.parse(raw);
  } catch {
    return json({ error: "invalid JSON" }, 500);
  }

  return json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    sha: meta.sha,
    status,
  });
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kokkai-voice-pages/1.0",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
