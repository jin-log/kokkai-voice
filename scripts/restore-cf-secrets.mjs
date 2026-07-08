/**
 * Cloudflare Pages の全シークレットを再設定する
 * set-cf-secret.mjs のバグで値が空になった場合の復旧用
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT_ID = "f2e88512cd4a09f315291bf2406015d7";
const PROJECT_NAME = "kokkai-voice";

async function getWranglerToken() {
  const p = join(homedir(), ".wrangler", "config", "default.toml");
  const txt = await readFile(p, "utf8");
  const m = txt.match(/oauth_token\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function setSecret(token, key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      deployment_configs: {
        production: { env_vars: { [key]: { type: "secret_text", value } } },
      },
    }),
  });
  const d = await res.json();
  if (d.success) {
    console.log(`✅ ${key}`);
  } else {
    console.error(`❌ ${key}:`, JSON.stringify(d.errors));
  }
}

const token = await getWranglerToken();
if (!token) { console.error("wrangler token not found"); process.exit(1); }

// git credential から GH_TOKEN を取得
import { execSync } from "node:child_process";
const credOut = execSync("git credential fill", { input: "protocol=https\nhost=github.com\n", encoding: "utf8" });
const ghToken = credOut.match(/password=(.+)/)?.[1]?.trim() ?? "";
if (!ghToken) { console.error("GH_TOKEN が git credential から取得できませんでした"); process.exit(1); }
const adminPin = "";

// buffer.envから読み込む
const bufEnv = Object.fromEntries(
  (await readFile("secrets/buffer.env", "utf8"))
    .split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

console.log("=== Cloudflare Pages シークレット再設定 ===");
await setSecret(token, "GH_TOKEN", ghToken);
await setSecret(token, "BUFFER_API_KEY", bufEnv.BUFFER_API_KEY);
await setSecret(token, "OPENAI_API_KEY", bufEnv.OPENAI_API_KEY);
if (adminPin) await setSecret(token, "ADMIN_PIN", adminPin);

console.log("完了。GOOGLE_SERVICE_ACCOUNT_JSON・TURNSTILE_SECRET_KEY は別途確認が必要");
