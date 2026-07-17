/**
 * Buffer GraphQL API — X 投稿
 * @see docs/buffer-setup.md
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://api.buffer.com";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
let envLoaded = false;

async function ensureBufferEnv() {
  if (envLoaded || process.env.BUFFER_API_KEY) {
    envLoaded = true;
    return;
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(path.join(root, "secrets/buffer.env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional local file */
  }
  envLoaded = true;
}

/** @returns {Promise<string|null>} */
export async function loadBufferApiKeyAsync() {
  await ensureBufferEnv();
  return loadBufferApiKey();
}

/** @returns {string|null} */
export function loadBufferApiKey() {
  return process.env.BUFFER_API_KEY?.trim() || null;
}

/** @returns {string|null} */
export function loadBufferChannelId() {
  return process.env.BUFFER_CHANNEL_ID?.trim() || null;
}

/**
 * @param {string} apiKey
 * @param {string} query
 * @param {object} [variables]
 */
export async function bufferGraphql(apiKey, query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Buffer API 応答が JSON ではありません (${res.status})`);
  }

  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || text.slice(0, 200);
    throw new Error(`Buffer HTTP ${res.status}: ${msg}`);
  }

  const code = body?.errors?.[0]?.extensions?.code;
  if (code === "RATE_LIMIT_EXCEEDED") {
    const err = new Error("Buffer レート上限（15分/日/30日）");
    err.code = "RATE_LIMIT_EXCEEDED";
    throw err;
  }
  if (body?.errors?.length) {
    const e = body.errors[0];
    const err = new Error(e.message || "Buffer API エラー");
    err.code = e.extensions?.code || "API_ERROR";
    throw err;
  }

  return body.data;
}

/** @param {string} apiKey */
export async function fetchOrganizations(apiKey) {
  const data = await bufferGraphql(
    apiKey,
    `query { account { organizations { id name } } }`,
  );
  return data?.account?.organizations ?? [];
}

/** @param {string} apiKey @param {string} organizationId */
export async function fetchChannels(apiKey, organizationId) {
  const data = await bufferGraphql(
    apiKey,
    `query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id
        name
        displayName
        service
        isQueuePaused
      }
    }`,
    { orgId: organizationId },
  );
  return data?.channels ?? [];
}

/** @param {string} apiKey @param {string} [preferredChannelId] */
export async function resolveTwitterChannel(apiKey, preferredChannelId) {
  const orgs = await fetchOrganizations(apiKey);
  if (!orgs.length) {
    return { ok: false, code: "NO_ORG", message: "Buffer 組織が見つかりません" };
  }

  for (const org of orgs) {
    const channels = await fetchChannels(apiKey, org.id);
    const twitter = channels.filter((c) => c.service === "twitter");
    if (!twitter.length) continue;

    if (preferredChannelId) {
      const picked = twitter.find((c) => c.id === preferredChannelId);
      if (picked) {
        return {
          ok: true,
          organizationId: org.id,
          channel: picked,
        };
      }
    }

    return {
      ok: true,
      organizationId: org.id,
      channel: twitter[0],
    };
  }

  return {
    ok: false,
    code: "NO_X_CHANNEL",
    message: "X（Twitter）チャンネルが Buffer に未連携です",
  };
}

/**
 * @param {string} apiKey
 * @param {{ channelId: string, text: string, threadTexts?: string[], imageUrls?: string[] }} opts
 */
export async function createXPost(apiKey, opts) {
  const { channelId, text, threadTexts, imageUrls } = opts;
  const thread =
    threadTexts && threadTexts.length > 1
      ? threadTexts.map((t) => ({ text: t }))
      : null;

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text status }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  /** @type {Record<string, unknown>} */
  const input = {
    text,
    channelId,
    schedulingType: "automatic",
    mode: "shareNow",
  };

  if (thread && thread.length > 1) {
    input.metadata = { twitter: { thread } };
  }

  const urls = (imageUrls || []).filter(Boolean);
  if (urls.length) {
    input.assets = urls.map((url) => ({ image: { url } }));
  }

  const data = await bufferGraphql(apiKey, mutation, { input });
  const result = data?.createPost;

  if (result?.message) {
    const err = new Error(result.message);
    err.code = "POST_REJECTED";
    throw err;
  }
  if (!result?.post?.id) {
    throw new Error("Buffer が post id を返しませんでした");
  }

  return result.post;
}

/** @param {string} apiKey @param {string} [channelId] */
export async function checkBufferConnection(apiKey, channelId) {
  if (!apiKey) {
    return {
      configured: false,
      ok: false,
      status: "not_configured",
      statusLabel: "未設定",
      message: "BUFFER_API_KEY が未設定です",
      fixSteps: [
        "Buffer で API キーを発行",
        "GitHub Secret: BUFFER_API_KEY",
        "ローカル: secrets/buffer.env または環境変数",
      ],
    };
  }

  try {
    const resolved = await resolveTwitterChannel(apiKey, channelId || undefined);
    if (!resolved.ok) {
      return {
        configured: true,
        ok: false,
        status: resolved.code === "NO_X_CHANNEL" ? "channel_disconnected" : "error",
        statusLabel: "X 未連携",
        message: resolved.message,
        fixSteps: [
          "buffer.com → チャンネル → X を接続",
          "接続後、管理画面で「再チェック」",
          "GitHub Secret BUFFER_CHANNEL_ID は通常不要（自動検出）",
        ],
      };
    }

    const ch = resolved.channel;
    return {
      configured: true,
      ok: true,
      status: "ok",
      statusLabel: "連携OK",
      message: `${ch.displayName || ch.name || "X"} に投稿可能`,
      organizationId: resolved.organizationId,
      channelId: ch.id,
      channelName: ch.displayName || ch.name,
      channelService: ch.service,
      queuePaused: ch.isQueuePaused === true,
      fixSteps: [],
    };
  } catch (err) {
    const code = err instanceof Error && "code" in err ? err.code : null;
    const msg = err instanceof Error ? err.message : String(err);
    const isAuth =
      code === "UNAUTHORIZED" ||
      /unauthorized|invalid.*token|authentication/i.test(msg);

    return {
      configured: true,
      ok: false,
      status: isAuth ? "auth_error" : code === "RATE_LIMIT_EXCEEDED" ? "rate_limited" : "error",
      statusLabel: isAuth ? "APIキー無効" : code === "RATE_LIMIT_EXCEEDED" ? "レート上限" : "エラー",
      message: msg,
      fixSteps: isAuth
        ? [
            "Buffer → 設定 → API → キーを再発行",
            "GitHub Secret BUFFER_API_KEY を更新",
            "Actions を再実行",
          ]
        : ["数分待って再チェック", "buffer.com で X 連携状態を確認"],
    };
  }
}
