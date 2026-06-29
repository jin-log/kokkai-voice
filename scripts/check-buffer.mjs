#!/usr/bin/env node
/**
 * Buffer 連携チェック → data/buffer-status.json + public/buffer-status.json
 */
import { refreshBufferStatus } from "../src/lib/buffer-status.mjs";
import { loadBufferApiKeyAsync } from "../src/lib/buffer-api.mjs";

await loadBufferApiKeyAsync();
const status = await refreshBufferStatus();
const mark = status.ok ? "OK" : status.status === "not_configured" ? "SKIP" : "NG";
console.log(`${mark} Buffer — ${status.statusLabel}: ${status.message}`);
if (status.fixSteps?.length) {
  for (const s of status.fixSteps) console.log(`  · ${s}`);
}
process.exit(status.ok || status.status === "not_configured" ? 0 : 1);
