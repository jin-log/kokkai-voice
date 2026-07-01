/**
 * Xスクショ自動化の一時停止（オーナー明示指示時のみ）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pausePath = path.join(root, "data/x-capture-paused.json");

/** @returns {Promise<{ paused: boolean, reason?: string }>} */
export async function getXCapturePauseState() {
  try {
    const data = JSON.parse(await readFile(pausePath, "utf8"));
    if (data?.paused === true) {
      return { paused: true, reason: data.reason || "paused" };
    }
    if (data?.until && new Date(data.until).getTime() > Date.now()) {
      return { paused: true, reason: data.reason || `until ${data.until}` };
    }
  } catch {
    // not paused
  }
  return { paused: false };
}
