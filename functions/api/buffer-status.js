/**
 * GET /api/buffer-status?pin=1192
 * Buffer 連携のライブチェック（連携切れを管理画面に表示）
 */
const API_URL = "https://api.buffer.com";

export async function onRequestGet(context) {
  const { BUFFER_API_KEY, BUFFER_CHANNEL_ID, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!BUFFER_API_KEY) {
    return json({
      ok: false,
      configured: false,
      status: "not_configured",
      statusLabel: "未設定",
      message: "BUFFER_API_KEY が Cloudflare/GitHub に未設定",
      fixSteps: [
        "Buffer → 設定 → API → キー発行",
        "GitHub Secret: BUFFER_API_KEY",
        "Cloudflare Pages → Settings → Environment variables に同じキー",
      ],
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const check = await checkBuffer(BUFFER_API_KEY, BUFFER_CHANNEL_ID || null);
    return json({
      ...check,
      fetchedAt: new Date().toISOString(),
      live: true,
    });
  } catch (err) {
    const isAuth = err?.code === "UNAUTHORIZED";
    return json({
      ok: false,
      configured: true,
      status: isAuth ? "auth_error" : "error",
      statusLabel: isAuth ? "APIキー無効" : "チェック失敗",
      message: err instanceof Error ? err.message : String(err),
      fixSteps: isAuth
        ? ["Buffer で API キーを再発行", "GitHub Secret / Cloudflare を更新"]
        : ["Buffer で X 連携を確認"],
      fetchedAt: new Date().toISOString(),
      live: true,
    });
  }
}

async function checkBuffer(apiKey, channelId) {
  const orgs = await gql(
    apiKey,
    `query { account { organizations { id name } } }`,
  );
  const organizations = orgs?.account?.organizations ?? [];
  if (!organizations.length) {
    return fail("channel_disconnected", "X 未連携", "Buffer 組織がありません", [
      "buffer.com でアカウントを確認",
    ]);
  }

  for (const org of organizations) {
    const data = await gql(
      apiKey,
      `query($orgId: OrganizationId!) {
        channels(input: { organizationId: $orgId }) {
          id name displayName service isQueuePaused
        }
      }`,
      { orgId: org.id },
    );
    const twitter = (data?.channels ?? []).filter((c) => c.service === "twitter");
    if (!twitter.length) continue;

    let ch = twitter[0];
    if (channelId) {
      const picked = twitter.find((c) => c.id === channelId);
      if (picked) ch = picked;
    }

    return {
      ok: true,
      configured: true,
      status: "ok",
      statusLabel: "連携OK",
      message: `${ch.displayName || ch.name} に自動投稿可能`,
      organizationId: org.id,
      channelId: ch.id,
      channelName: ch.displayName || ch.name,
      queuePaused: ch.isQueuePaused === true,
      fixSteps: [],
    };
  }

  return fail("channel_disconnected", "X 未連携", "X（Twitter）が Buffer に接続されていません", [
    "buffer.com → Channels → Connect X",
    "接続後、この画面を再読込",
  ]);
}

function fail(status, statusLabel, message, fixSteps) {
  return {
    ok: false,
    configured: true,
    status,
    statusLabel,
    message,
    fixSteps,
  };
}

async function gql(apiKey, query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    const e = body.errors[0];
    const code = e.extensions?.code;
    if (code === "UNAUTHORIZED") {
      const err = new Error(e.message || "Unauthorized");
      err.code = "UNAUTHORIZED";
      throw err;
    }
    throw new Error(e.message || "Buffer API error");
  }
  return body.data;
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
