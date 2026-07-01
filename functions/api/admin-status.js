import { decodeGitHubBase64Utf8 } from "../lib/github-content.js";

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
  const [runsRes, statusRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/jin-log/kokkai-voice/actions/runs?per_page=${perPage}&branch=main`,
      { headers: ghHeaders(GH_TOKEN) },
    ),
    fetch(
      "https://api.github.com/repos/jin-log/kokkai-voice/contents/data/project-status.json?ref=main",
      { headers: ghHeaders(GH_TOKEN) },
    ),
  ]);

  if (!runsRes.ok) {
    const detail = await runsRes.text();
    return json({ error: `GitHub API ${runsRes.status}`, detail }, 500);
  }

  const data = await runsRes.json();
  const runs = (data.workflow_runs ?? []).map((r) => {
    const slugHint = parseSlugFromRun(r);
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      url: r.html_url,
      event: r.event,
      slugHint,
      inProgress: r.status === "in_progress" || r.status === "queued" || r.status === "waiting" || r.status === "pending",
      pending: r.status === "queued" || r.status === "waiting" || r.status === "pending",
    };
  });

  const active = runs.filter((r) => r.inProgress);
  const recentFailed = runs.filter((r) => r.conclusion === "failure").slice(0, 3);

  let projectStatus = null;
  if (statusRes.ok) {
    try {
      const meta = await statusRes.json();
      if (meta.content) {
        projectStatus = JSON.parse(decodeGitHubBase64Utf8(meta.content));
      }
    } catch {
      /* 完成度だけ失敗 — Actions 情報は返す */
    }
  }

  const deployFailed = runs.some(
    (r) => r.name === "Deploy to Cloudflare Pages" && r.conclusion === "failure",
  );

  return json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    activeCount: active.length,
    active,
    recentFailed,
    runs,
    projectStatus,
    deployFailed,
    /** slug → いま動いている workflow 名 */
    activeBySlug: buildActiveBySlug(runs),
  });
}

/** @param {{ slugHint?: string|null, inProgress?: boolean, name?: string }[]} runs */
function buildActiveBySlug(runs) {
  /** @type {Record<string, string>} */
  const map = {};
  for (const r of runs) {
    if (!r.inProgress || !r.slugHint) continue;
    map[r.slugHint] = r.name ?? "処理中";
  }
  return map;
}

function parseSlugFromRun(run) {
  const msg = run.head_commit?.message || run.display_title || "";
  let m = msg.match(/article:\s*(\S+)/);
  if (m) return m[1];
  m = msg.match(/admin:\s*\w+\s+(\S+)/);
  if (m) return m[1];
  m = msg.match(/記事[：:]\s*(\S+)/);
  if (m) return m[1];
  return null;
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
