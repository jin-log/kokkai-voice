#!/usr/bin/env node
/**
 * YouTube OAuth 初回認証（1回だけ）
 *
 * Usage:
 *   npm run youtube:auth
 *
 * 前提: secrets/youtube-oauth.json（Desktop OAuth クライアント）
 * ブラウザ: secrets/browser/chrome-profile.json の seiji1192 専用 Chrome（Profile 9）を使う。
 * Cursor 内蔵ブラウザや既定ブラウザでのゼロからログインはしない。
 */
import http from "node:http";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  buildAuthUrl,
  exchangeCode,
  loadOAuthClient,
  tokenPath,
} from "./lib/youtube-oauth.mjs";
import { loadChromeProfileConfig } from "./lib/chrome-profile.mjs";

const WIN_CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

/** @returns {Promise<string|null>} */
async function resolveChromeExe() {
  for (const p of WIN_CHROME) {
    try {
      await access(p);
      return p;
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * seiji1192 専用 Chrome（Profile 9）で OAuth URL を開く
 * @param {string} url
 */
async function openBrowser(url) {
  const cfg = await loadChromeProfileConfig();
  const chromeExe = process.platform === "win32" ? await resolveChromeExe() : null;

  if (chromeExe && cfg?.profileDirectory) {
    const label = cfg.label || cfg.profileDirectory;
    // 起動中の普段 Chrome に Profile 指定で URL を渡す（Cursor 内蔵ブラウザは使わない）
    console.log(`[youtube:auth] 専用 Chrome で開く: ${label} (${cfg.profileDirectory})`);
    spawn(
      chromeExe,
      [`--profile-directory=${cfg.profileDirectory}`, "--new-window", url],
      { detached: true, stdio: "ignore" },
    ).unref();
    return;
  }

  console.warn("[youtube:auth] chrome-profile.json なし — 既定ブラウザにフォールバック");
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* 手動で開いてもらう */
  }
}

async function main() {
  const client = await loadOAuthClient();
  if (!client?.client_id || client.client_id.startsWith("YOUR_")) {
    console.error("[youtube:auth] secrets/youtube-oauth.json が未設定です。");
    console.error("  → docs/youtube-api-setup.md の手順に従ってください。");
    process.exit(1);
  }

  const callbackArg = process.argv.find((a) => a.startsWith("--callback-url="));
  const codeArg = process.argv.find((a) => a.startsWith("--code="));

  if (callbackArg || codeArg) {
    let code = codeArg?.slice("--code=".length) ?? "";
    if (callbackArg) {
      const raw = callbackArg.slice("--callback-url=".length);
      code = new URL(raw).searchParams.get("code") ?? "";
    }
    if (!code) {
      console.error("[youtube:auth] code が取れませんでした");
      process.exit(1);
    }
    await exchangeCode(client, code);
    console.log(`[youtube:auth] OK → ${tokenPath()}`);
    console.log("[youtube:auth] 次: npm run short:upload -- --slug shussho-budget-seika");
    return;
  }

  const authUrl = buildAuthUrl(client);
  console.log("[youtube:auth] seiji1192 専用 Chrome で許可してください（ログイン済みのはず）:");
  console.log("");
  console.log(authUrl);
  console.log("");
  console.log(`  待受: ${client.redirect_uri}`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url ?? "/", client.redirect_uri);
      if (u.pathname !== new URL(client.redirect_uri).pathname) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const c = u.searchParams.get("code");
      const err = u.searchParams.get("error");
      if (err) {
        res.writeHead(400);
        res.end(`エラー: ${err}`);
        reject(new Error(err));
        server.close();
        return;
      }
      if (!c) {
        res.writeHead(400);
        res.end("code がありません");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<html><body><p>認証完了。このタブを閉じてターミナルに戻ってください。</p></body></html>",
      );
      resolve(c);
      server.close();
    });

    server.listen(new URL(client.redirect_uri).port || 8765, "127.0.0.1", () => {
      openBrowser(authUrl).catch((e) => reject(e));
    });

    server.on("error", reject);
    setTimeout(() => {
      server.close();
      reject(new Error("認証タイムアウト（15分）— もう一度 npm run youtube:auth"));
    }, 15 * 60 * 1000);
  });

  await exchangeCode(client, code);
  console.log(`[youtube:auth] OK → ${tokenPath()}`);
  console.log("[youtube:auth] 次: npm run short:upload -- --slug shussho-budget-seika");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
