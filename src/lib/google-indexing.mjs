/**
 * Google Indexing API — URL_UPDATED 通知（GSC 手動の代替）
 * 要: サービスアカウント + GSC オーナー権限
 * @see docs/google-indexing-setup.md
 */
import { createSign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";
const LOG_PATH = path.join(root, "data/google-index-log.json");
const CREDENTIAL_PATHS = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.join(root, "secrets/google-service-account.json"),
].filter(Boolean);

/** @returns {Promise<object|null>} */
export async function loadGoogleCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON の JSON が不正です");
    }
  }
  for (const p of CREDENTIAL_PATHS) {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      /* try next */
    }
  }
  return null;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** @param {object} creds */
async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(creds.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `token ${res.status}`);
  }
  return data.access_token;
}

/** @returns {Promise<Record<string, string>>} */
async function readLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} log */
async function writeLog(log) {
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

/**
 * @param {string[]} urlList
 * @param {{ dryRun?: boolean; force?: boolean; minHours?: number }} opts
 */
export async function pingGoogleIndexing(urlList, opts = {}) {
  const minHours = opts.minHours ?? 24;
  const creds = await loadGoogleCredentials();

  if (!creds) {
    return [
      {
        service: "Google Indexing API",
        ok: true,
        status: "skipped",
        skipped: true,
        message: "認証未設定 — docs/google-indexing-setup.md を参照",
      },
    ];
  }

  const log = await readLog();
  const since = Date.now() - minHours * 3600 * 1000;
  const targets = opts.force
    ? urlList
    : urlList.filter((url) => {
        const last = log[url];
        return !last || new Date(last).getTime() < since;
      });

  if (targets.length === 0) {
    return [
      {
        service: "Google Indexing API",
        ok: true,
        status: "skipped",
        skipped: true,
        message: `${minHours}時間以内に送信済みのためスキップ`,
      },
    ];
  }

  if (opts.dryRun) {
    return [
      {
        service: "Google Indexing API",
        ok: true,
        status: "dry-run",
        count: targets.length,
      },
    ];
  }

  const token = await getAccessToken(creds);
  const results = [];
  let okCount = 0;

  for (const url of targets) {
    let lastStatus = 0;
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(PUBLISH_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, type: "URL_UPDATED" }),
        });
        lastStatus = res.status;
        if (res.status === 429) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (res.status === 403) {
          lastError =
            "403 — GSCでサービスアカウントを「オーナー」追加したか確認（5〜10分待つ）";
          break;
        }
        if (res.ok) {
          log[url] = new Date().toISOString();
          okCount++;
          break;
        }
        const body = await res.text();
        lastError = body.slice(0, 200) || `HTTP ${res.status}`;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await sleep(1000);
      }
    }
    if (lastStatus && lastStatus >= 400 && lastStatus !== 429) {
      results.push({ url, ok: false, status: lastStatus, error: lastError });
    }
    await sleep(300);
  }

  await writeLog(log);

  return [
    {
      service: "Google Indexing API",
      ok: okCount > 0 || results.length === 0,
      status: okCount,
      count: targets.length,
      submitted: okCount,
      failed: results,
      account: creds.client_email,
    },
  ];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || CREDENTIAL_PATHS.length);
}
