/**
 * 既存 Chrome プロフィール（seiji1192 等）を自動化で使う設定
 * 実体: secrets/browser/chrome-profile.json（gitignore）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = path.join(root, "secrets/browser/chrome-profile.json");

/** @returns {Promise<{ userDataDir: string, profileDirectory: string, label?: string } | null>} */
export async function loadChromeProfileConfig() {
  try {
    const raw = JSON.parse(await readFile(configPath, "utf8"));
    if (!raw?.userDataDir || !raw?.profileDirectory) return null;
    return {
      userDataDir: String(raw.userDataDir),
      profileDirectory: String(raw.profileDirectory),
      label: raw.label ? String(raw.label) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} [isolatedUserDataDir] secrets/browser/profile-*（設定なし時）
 * @returns {Promise<{ userDataDir: string, profileDirectory?: string, label?: string, mode: "chrome" | "isolated" }>}
 */
export async function resolveBrowserLaunch(isolatedUserDataDir) {
  const shared = await loadChromeProfileConfig();
  if (shared) {
    return {
      userDataDir: shared.userDataDir,
      profileDirectory: shared.profileDirectory,
      label: shared.label,
      mode: "chrome",
    };
  }
  return { userDataDir: isolatedUserDataDir, mode: "isolated" };
}
