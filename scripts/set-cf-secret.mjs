/**
 * Cloudflare Pages に環境変数（Secret）を設定するスクリプト
 * Usage: node scripts/set-cf-secret.mjs KEY VALUE
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const [, , KEY, VALUE] = process.argv;
if (!KEY || !VALUE) {
  console.error("Usage: node set-cf-secret.mjs KEY VALUE");
  process.exit(1);
}

const ACCOUNT_ID = "f2e88512cd4a09f315291bf2406015d7";
const PROJECT_NAME = "kokkai-voice";

// wrangler の OAuth トークンを取得
async function getWranglerToken() {
  // wrangler v3/v4 の auth ファイル場所
  const paths = [
    join(homedir(), ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", "wrangler", "config", "default.toml"),
  ];
  for (const p of paths) {
    try {
      const txt = await readFile(p, "utf8");
      const m = txt.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    } catch {}
  }
  return null;
}

const token = await getWranglerToken();
if (!token) {
  console.error("wrangler OAuthトークンが見つかりません。npx wrangler loginを実行してください。");
  process.exit(1);
}

// Cloudflare Pages プロジェクトの環境変数を PATCH で更新
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`;

// まず現在の設定を取得
// 追加/更新するキーだけをPATCHする（既存シークレットをPATCHに含めると値が空になる）
const patchRes = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deployment_configs: {
      production: {
        env_vars: {
          [KEY]: { type: "secret_text", value: VALUE },
        },
      },
    },
  }),
});

const result = await patchRes.json();
if (result.success) {
  console.log(`✅ ${KEY} を Cloudflare Pages (production) に設定しました`);
} else {
  console.error("設定失敗:", JSON.stringify(result.errors));
  process.exit(1);
}
