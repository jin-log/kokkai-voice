/**
 * Cloudflare Pages Function: /api/dispatch
 * 開発者用 — 記事生成・本番反映ワークフローをトリガーする
 *
 * 必要な Cloudflare Pages 環境変数:
 *   GH_TOKEN        : GitHub PAT (workflow 権限)
 *   ADMIN_PIN       : 管理者PIN (例: 1192)
 *   TAVILY_API_KEY  : 任意（ソースURL自動取得の精度向上）
 *
 * POST body:
 *   { pin, action?, slug?, keyword?, title? }
 *   action: "create" | "deploy" | "deploy_article" | "publish" | "update_title" | "hide" | "unhide" | "delete_article"
 */
import { prepareArticleCreate } from "../lib/article-prepare.js";

export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN, TAVILY_API_KEY } = context.env;

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
      "admin-article.yml",
      { action: "publish", slug, title: "" },
      `「${slug}」を公開しました。1〜2分で /case/${slug}/ に表示されます。`,
    );
  }

  if (action === "update_title") {
    const slug = slugIn?.trim();
    const title = titleIn?.trim();
    if (!slug || !title) {
      return json({ error: "slug と title は必須です" }, 400);
    }
    return dispatchWorkflow(
      GH_TOKEN,
      "admin-article.yml",
      { action: "update_title", slug, title },
      `タイトルを更新しました。1〜2分後に本番へ反映されます（deploy 自動）。`,
    );
  }

  if (action === "hide" || action === "unhide") {
    const slug = slugIn?.trim();
    if (!slug) {
      return json({ error: "slug は必須です" }, 400);
    }
    const label = action === "hide" ? "非表示" : "表示";
    return dispatchWorkflow(
      GH_TOKEN,
      "admin-article.yml",
      { action, slug, title: "" },
      `「${slug}」を${label}にしました。`,
    );
  }

  if (action === "delete_article") {
    const slug = slugIn?.trim();
    if (!slug) {
      return json({ error: "slug は必須です" }, 400);
    }
    return dispatchWorkflow(
      GH_TOKEN,
      "admin-article.yml",
      { action: "delete", slug, title: "" },
      `「${slug}」を削除しました。`,
    );
  }

  if (action !== "create") {
    return json({ error: `不明な action: ${action}` }, 400);
  }

  if (!keyword?.trim()) {
    return json({ error: "キーワードを入力してください。" }, 400);
  }

  const prepared = await prepareArticleCreate({
    keyword: keyword.trim(),
    title: titleIn,
    slug: slugIn,
    env: { TAVILY_API_KEY },
  });

  if (!prepared.ok) {
    return json({ ok: false, error: prepared.error, category: prepared.category ?? null }, 422);
  }

  const { slug, title, keyword: keywordClean, category, tags, sources, plan } = prepared;

  return dispatchWorkflow(
    GH_TOKEN,
    "create-article.yml",
    { slug, keyword: keywordClean, title, category, tags, sources },
    `記事生成を開始しました（${plan}）。3〜5分後にプレビューを確認してください。`,
    { slug, category, plan },
  );
}

async function dispatchWorkflow(token, workflowFile, inputs, successMessage, extra = {}) {
  const res = await fetch(
    `https://api.github.com/repos/jin-log/kokkai-voice/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: "main", inputs }),
    },
  );

  if (res.status === 204) {
    return json({ ok: true, message: successMessage, ...extra });
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

