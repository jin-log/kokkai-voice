/**
 * Cloudflare Pages Function: /api/dispatch
 * 開発者用 — 記事操作・本番反映ワークフローをトリガーする
 *
 * 必要な Cloudflare Pages 環境変数:
 *   GH_TOKEN        : GitHub PAT (contents:write 権限で動作。workflow権限は不要)
 *   ADMIN_PIN       : 管理者PIN (例: 1192)
 *   TAVILY_API_KEY  : 任意（ソースURL自動取得の精度向上）
 *
 * POST body:
 *   { pin, action?, slug?, keyword?, title? }
 *   action: "create" | "deploy" | "deploy_article" | "publish" | "update_title" | "hide" | "unhide" | "delete_article"
 *
 * deploy_article / update_title / hide / unhide は GitHub Contents API で直書き
 * → workflow_dispatch 権限不要・push トリガーで deploy.yml が自動起動
 */
import { prepareArticleCreate } from "../lib/article-prepare.js";
import { decodeGitHubBase64Utf8, encodeGitHubBase64Utf8 } from "../lib/github-content.js";

const REPO = "jin-log/kokkai-voice";

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
    if (!slug) return json({ error: "slug は必須です" }, 400);
    const now = new Date().toISOString();
    const result = await updateArticleJson(GH_TOKEN, slug, (article) => {
      article.pageReady = true;
      article.publishReady = true;
      article.adminHidden = false;
      delete article.adminHiddenAt;
      delete article.adminHiddenBy;
      article.publishedAt = now;
      article.publishedBy = "owner";
    }, `admin: publish ${slug}`);
    if (!result.ok) return json({ error: result.error, detail: result.detail }, result.status ?? 500);
    return json({ ok: true, message: `「${slug}」を公開しました。1〜2分後に本番に反映されます。` });
  }

  if (action === "update_title") {
    const slug = slugIn?.trim();
    const title = titleIn?.trim();
    if (!slug || !title) return json({ error: "slug と title は必須です" }, 400);
    const result = await updateArticleJson(GH_TOKEN, slug, (article) => {
      article.title = title;
    }, `admin: update_title ${slug}`);
    if (!result.ok) return json({ error: result.error, detail: result.detail }, result.status ?? 500);
    return json({ ok: true, message: `タイトルを更新しました。1〜2分後に本番へ反映されます。` });
  }

  if (action === "hide" || action === "unhide") {
    const slug = slugIn?.trim();
    if (!slug) return json({ error: "slug は必須です" }, 400);
    const isHide = action === "hide";
    const now = new Date().toISOString();
    const result = await updateArticleJson(GH_TOKEN, slug, (article) => {
      article.adminHidden = isHide;
      if (isHide) {
        article.adminHiddenAt = now;
        article.adminHiddenBy = "owner";
      } else {
        delete article.adminHiddenAt;
        delete article.adminHiddenBy;
      }
    }, `admin: ${action} ${slug}`);
    if (!result.ok) return json({ error: result.error, detail: result.detail }, result.status ?? 500);
    const label = isHide ? "非表示" : "表示";
    return json({ ok: true, message: `「${slug}」を${label}にしました。1〜2分後に反映されます。` });
  }

  if (action === "delete_article") {
    const slug = slugIn?.trim();
    if (!slug) return json({ error: "slug は必須です" }, 400);
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

  // 1) 即時: article-create-log.json に pending エントリを書き込む（管理画面に「生成中」表示）
  await appendCreateLog(GH_TOKEN, { slug, keyword: keywordClean, title, category, status: "pending" });

  // 2) repository_dispatch で create-article.yml を起動（contents:write 権限のみで動作）
  const dispatchRes = await fetch(
    `https://api.github.com/repos/${REPO}/dispatches`,
    {
      method: "POST",
      headers: ghHeaders(GH_TOKEN),
      body: JSON.stringify({
        event_type: "create-article",
        client_payload: { slug, keyword: keywordClean, title, category, tags, sources },
      }),
    },
  );

  if (dispatchRes.status !== 204) {
    const detail = await dispatchRes.text();
    return json({ error: `GitHub dispatch エラー: ${dispatchRes.status}`, detail }, 500);
  }

  return json({
    ok: true,
    message: `記事生成を開始しました（${plan}）。3〜5分後にプレビューを確認してください。`,
    slug,
    category,
    plan,
  });
}

/**
 * article-create-log.json に pending/done エントリを追記
 * 管理画面の「生成中」表示に使う
 */
async function appendCreateLog(token, { slug, keyword, title, category, status }) {
  const filePath = "data/article-create-log.json";
  const apiBase = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  const now = new Date().toISOString();

  let log = { entries: [] };
  let sha = null;
  try {
    const getRes = await fetch(`${apiBase}?ref=main`, { headers: ghHeaders(token) });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
      log = JSON.parse(decodeGitHubBase64Utf8(meta.content));
    }
  } catch { /* new log */ }

  const existing = (log.entries ?? []).find((e) => e.slug === slug);
  log.entries = (log.entries ?? []).filter((e) => e.slug !== slug);
  log.entries.unshift({
    slug,
    keyword,
    title: title || existing?.title || "",
    category,
    status,
    at: existing?.at || now,
    updatedAt: now,
  });
  log.entries = log.entries.slice(0, 50);
  log.updatedAt = now;

  const newContent = encodeGitHubBase64Utf8(JSON.stringify(log, null, 2) + "\n");
  const body = { message: `create-log: ${status} ${slug}`, content: newContent, branch: "main" };
  if (sha) body.sha = sha;
  await fetch(apiBase, { method: "PUT", headers: ghHeaders(token), body: JSON.stringify(body) });
}

/**
 * GitHub Contents API で記事 JSON を取得→更新→プッシュ
 * contents:write 権限のみで動作（workflow 権限不要）
 * push → deploy.yml が自動起動してサイト再ビルド
 */
async function updateArticleJson(token, slug, updateFn, commitMsg) {
  const filePath = `data/articles/${slug}.json`;
  const apiBase = `https://api.github.com/repos/${REPO}/contents/${filePath}`;

  const getRes = await fetch(`${apiBase}?ref=main`, { headers: ghHeaders(token) });
  if (!getRes.ok) {
    const detail = await getRes.text();
    return { ok: false, error: `記事取得エラー: ${getRes.status}`, detail, status: getRes.status === 404 ? 404 : 500 };
  }
  const meta = await getRes.json();

  let article;
  try {
    article = JSON.parse(decodeGitHubBase64Utf8(meta.content));
  } catch {
    return { ok: false, error: "記事 JSON のパースに失敗しました", status: 500 };
  }

  updateFn(article);

  const newContent = encodeGitHubBase64Utf8(JSON.stringify(article, null, 2) + "\n");
  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify({ message: commitMsg, content: newContent, sha: meta.sha, branch: "main" }),
  });

  if (!putRes.ok) {
    const detail = await putRes.text();
    return { ok: false, error: `保存エラー: ${putRes.status}`, detail, status: 500 };
  }

  return { ok: true };
}

async function dispatchWorkflow(token, workflowFile, inputs, successMessage, extra = {}) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflowFile}/dispatches`,
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

