#!/usr/bin/env node
/**
 * GitHub Secrets へブラウザ state を登録
 * git credential から自動でトークンを取得
 *
 * Usage: node scripts/upload-browser-secrets.mjs
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sodium from "tweetsodium";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_OWNER = "jin-log";
const REPO_NAME = "kokkai-voice";

function getGitHubToken() {
  try {
    const out = execSync("git credential fill", {
      input: "protocol=https\nhost=github.com\n",
      encoding: "utf8",
    });
    const match = out.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch { /* */ }
  return process.env.GH_TOKEN || null;
}

function encryptSecret(publicKeyB64, secretValue) {
  const publicKey = Buffer.from(publicKeyB64, "base64");
  const secretBytes = Buffer.from(secretValue, "utf8");
  const encrypted = sodium.seal(secretBytes, publicKey);
  return Buffer.from(encrypted).toString("base64");
}

async function ghFetch(token, path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "kokkai-voice-cli",
      ...(opts.headers ?? {}),
    },
  });
  return res;
}

async function setSecret(token, secretName, secretValue) {
  // リポジトリの公開鍵を取得
  const keyRes = await ghFetch(token, `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`);
  if (!keyRes.ok) throw new Error(`公開鍵取得失敗: ${keyRes.status} ${await keyRes.text()}`);
  const { key, key_id } = await keyRes.json();

  const encryptedValue = encryptSecret(key, secretValue);

  const putRes = await ghFetch(token, `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${secretName}`, {
    method: "PUT",
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id }),
  });

  if (putRes.ok || putRes.status === 204) {
    return true;
  }
  throw new Error(`Secret登録失敗: ${putRes.status} ${await putRes.text()}`);
}

async function main() {
  const token = getGitHubToken();
  if (!token) {
    console.error("NG: GitHub トークンが取得できませんでした");
    process.exit(1);
  }
  console.log("トークン取得: OK");

  const secrets = [
    { name: "HATENA_BROWSER_STATE", file: "secrets/browser/state-hatena.json" },
    { name: "NOTE_BROWSER_STATE",   file: "secrets/browser/state-note.json" },
  ];

  for (const { name, file } of secrets) {
    const filePath = path.join(root, file);
    let content;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      console.log(`SKIP ${name}: ファイルなし (${filePath})`);
      continue;
    }
    process.stdout.write(`${name} 登録中… `);
    await setSecret(token, name, content);
    console.log("OK");
  }

  console.log("\n完了: promo-on-publish.yml が次の deploy 後に自動実行されます");
}

main().catch((e) => {
  console.error("NG:", e.message);
  process.exit(1);
});
