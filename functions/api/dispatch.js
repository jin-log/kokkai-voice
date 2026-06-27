/**
 * Cloudflare Pages Function: /api/dispatch
 * 開発者用 — 記事生成ワークフローをトリガーする
 * 
 * 必要な Cloudflare Pages 環境変数:
 *   GH_TOKEN   : GitHub PAT (workflow 権限)
 *   ADMIN_PIN  : 管理者PIN (例: 1192)
 */
export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { pin, slug: slugIn, keyword, title: titleIn, category = "国会", tags = "" } = body;

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!keyword?.trim()) {
    return json({ error: "keyword は必須です" }, 400);
  }

  const keywordClean = keyword.trim();
  const title = titleIn?.trim() || `${keywordClean} — あの話どうなった？`;
  const slug = slugIn?.trim() || makeSlug(keywordClean);

  const res = await fetch(
    "https://api.github.com/repos/jin-log/kokkai-voice/actions/workflows/create-article.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "kokkai-voice-pages/1.0",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { slug, keyword, title, category, tags },
      }),
    }
  );

  if (res.status === 204) {
    return json({ ok: true, message: "ワークフロー起動しました。2〜3分でデプロイ完了します。" });
  }

  const errText = await res.text();
  return json({ error: `GitHub API エラー: ${res.status}`, detail: errText }, 500);
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
