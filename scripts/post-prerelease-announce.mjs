#!/usr/bin/env node
/**
 * プレリリース告知 1/7 を Buffer 経由で X 投稿
 * secrets/buffer.env または BUFFER_API_KEY 必須
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createXPost, loadBufferApiKeyAsync, resolveTwitterChannel } from "../src/lib/buffer-api.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const TEXT = `【プレリリース】サイト「日本の政治now.」を公開しました。

「あの話、どうなった？」を案件ごとに追います。
国会議事録・政府資料・報道を出典付きで整理。

https://seiji1192.site

プレリリース中です。読みやすさ・誤り・追ってほしい案件のフィードバック歓迎 → @seiji1192site`;

async function main() {
  if (dryRun) {
    console.log(TEXT);
    console.log(`\n(${TEXT.length} 文字)`);
    return;
  }

  const apiKey = await loadBufferApiKeyAsync();
  if (!apiKey) {
    console.error("BUFFER_API_KEY 未設定。Mac で buffer.com → API → キー発行 → secrets/buffer.env");
    process.exit(1);
  }

  const channelId = await resolveTwitterChannel(apiKey);
  const result = await createXPost(apiKey, channelId, TEXT);
  console.log("OK: プレリリース 1/7 を Buffer に投稿しました");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
