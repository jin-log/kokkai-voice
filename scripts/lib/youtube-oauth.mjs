/**
 * YouTube Data API — OAuth 2.0（チャンネル投稿用）
 * トークン: secrets/youtube-token.json（gitignore）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

const OAUTH_PATHS = [
  process.env.YOUTUBE_OAUTH_JSON,
  path.join(root, "secrets/youtube-oauth.json"),
].filter(Boolean);

const TOKEN_PATH = path.join(root, "secrets/youtube-token.json");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** @returns {Promise<{ client_id: string; client_secret: string; redirect_uri: string }|null>} */
export async function loadOAuthClient() {
  if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
    return {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI ?? "http://localhost:8765/oauth2callback",
    };
  }
  for (const p of OAUTH_PATHS) {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      /* next */
    }
  }
  return null;
}

/** @returns {Promise<object|null>} */
export async function loadToken() {
  try {
    return JSON.parse(await readFile(TOKEN_PATH, "utf8"));
  } catch {
    return null;
  }
}

/** @param {object} token */
export async function saveToken(token) {
  await writeFile(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, "utf8");
}

/**
 * @param {{ client_id: string; client_secret: string; redirect_uri: string }} client
 */
export function buildAuthUrl(client) {
  const params = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: client.redirect_uri,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params}`;
}

/**
 * @param {{ client_id: string; client_secret: string; redirect_uri: string }} client
 * @param {string} code
 */
export async function exchangeCode(client, code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: client.redirect_uri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `token exchange ${res.status}`);
  }
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    scope: data.scope,
  };
  await saveToken(token);
  return token;
}

/**
 * @param {{ client_id: string; client_secret: string }} client
 * @param {object} token
 */
export async function refreshAccessToken(client, token) {
  if (!token.refresh_token) {
    throw new Error("refresh_token がありません。npm run youtube:auth を再実行してください。");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `refresh ${res.status}`);
  }
  const next = {
    ...token,
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  if (data.refresh_token) next.refresh_token = data.refresh_token;
  await saveToken(next);
  return next;
}

/** @returns {Promise<string>} access_token */
export async function getAccessToken() {
  const client = await loadOAuthClient();
  if (!client) {
    throw new Error(
      "YouTube OAuth 未設定 — secrets/youtube-oauth.json を置くか docs/youtube-api-setup.md を参照",
    );
  }
  let token = await loadToken();
  if (!token?.refresh_token) {
    throw new Error("YouTube 未認証 — npm run youtube:auth を1回実行してください");
  }
  if (!token.access_token || Date.now() > (token.expires_at ?? 0) - 60_000) {
    token = await refreshAccessToken(client, token);
  }
  return token.access_token;
}

export function tokenPath() {
  return TOKEN_PATH;
}

export function isYoutubeConfigured() {
  return OAUTH_PATHS.length > 0;
}
