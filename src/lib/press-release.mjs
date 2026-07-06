import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRESS_RELEASE_PATH = path.join(root, "data/press-release.json");
const INTRO_LOG_PATH = path.join(root, "data/promo-intro-log.json");

export async function loadPressRelease() {
  const raw = await readFile(PRESS_RELEASE_PATH, "utf8");
  return JSON.parse(raw);
}

export async function loadPressReleaseLog() {
  try {
    const raw = await readFile(INTRO_LOG_PATH, "utf8");
    const log = JSON.parse(raw);
    return log.pressReleases ?? {};
  } catch {
    return {};
  }
}

/** @param {Record<string, { postedAt?: string, publishedUrl?: string }>} log @param {string} channelId */
export function pressChannelStatus(log, channelId) {
  const row = log[channelId];
  if (!row?.postedAt) return { done: false, postedAt: null, publishedUrl: row?.publishedUrl || "" };
  return { done: true, postedAt: row.postedAt, publishedUrl: row.publishedUrl || "" };
}
