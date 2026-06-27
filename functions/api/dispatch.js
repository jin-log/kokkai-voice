/**
 * Cloudflare Pages Function: /api/dispatch
 * 開発者用 — 記事生成・本番反映ワークフローをトリガーする
 *
 * 必要な Cloudflare Pages 環境変数:
 *   GH_TOKEN   : GitHub PAT (workflow 権限)
 *   ADMIN_PIN  : 管理者PIN (例: 1192)
 *
 * POST body:
 *   { pin, action?, slug?, keyword?, title?, category?, sources? }
 *   action: "create" | "deploy" | "deploy_article"  (default: create)
 */
export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const {
    pin,
    action = "create",
    slug: slugIn,
    keyword,
    title: titleIn,
    category = "国会",
    tags = "",
    sources = "",
  } = body;

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!GH_TOKEN) {
    return json({ error: "GH_TOKEN が未設定です" }, 500);
  }

  if (action === "deploy") {
    return dispatchWorkflow(GH_TOKEN, "deploy.yml", { slug: "" }, "本番デプロイを起動しました。1〜2分で反映されます。");
  }

  if (action === "deploy_article") {
    const slug = slugIn?.trim();
    if (!slug) {
      return json({ error: "slug は必須です" }, 400);
    }
    return dispatchWorkflow(
      GH_TOKEN,
      "publish-article.yml",
      { slug },
      `「${slug}」の本番反映を起動しました。ゲートチェック後、1〜2分で反映されます。`,
    );
  }

  if (action !== "create") {
    return json({ error: `不明な action: ${action}` }, 400);
  }

  if (!keyword?.trim()) {
    return json({ error: "keyword は必須です" }, 400);
  }

  const keywordClean = keyword.trim();
  const title = titleIn?.trim() || `${keywordClean} — あの話どうなった？`;
  const slug = slugIn?.trim() || makeSlug(keywordClean);

  return dispatchWorkflow(
    GH_TOKEN,
    "create-article.yml",
    { slug, keyword: keywordClean, title, category, tags, sources },
    `記事生成ワークフロー起動（/${slug}/）。2〜3分でデプロイ完了します。`,
  );
}

async function dispatchWorkflow(token, workflowFile, inputs, successMessage) {
  const res = await fetch(
    `https://api.github.com/repos/jin-log/kokkai-voice/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: "main", inputs }),
    },
  );

  if (res.status === 204) {
    return json({ ok: true, message: successMessage });
  }

  const errText = await res.text();
  return json({ error: `GitHub API エラー: ${res.status}`, detail: errText }, 500);
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
    headers: { "Content-Type": "application/json" },
  });
}

function makeSlug(keyword) {
  const ascii = keyword
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (ascii.length >= 3) return ascii.substring(0, 40);
  return `case-${Date.now().toString(36)}`;
}
