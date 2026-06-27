/**
 * GET /api/admin-status?pin=1192
 * GitHub Actions の実行状況（デプロイ待ち可視化）
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

  const perPage = 12;
  const res = await fetch(
    `https://api.github.com/repos/jin-log/kokkai-voice/actions/runs?per_page=${perPage}&branch=main`,
    { headers: ghHeaders(GH_TOKEN) },
  );

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `GitHub API ${res.status}`, detail }, 500);
  }

  const data = await res.json();
  const runs = (data.workflow_runs ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    url: r.html_url,
    event: r.event,
    inProgress: r.status === "in_progress" || r.status === "queued" || r.status === "waiting",
    pending: r.status === "queued" || r.status === "waiting",
  }));

  const active = runs.filter((r) => r.inProgress);
  const recentFailed = runs.filter((r) => r.conclusion === "failure").slice(0, 3);

  return json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    activeCount: active.length,
    active,
    recentFailed,
    runs,
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
