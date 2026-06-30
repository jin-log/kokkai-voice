/**
 * Playwright ブラウザ起動（promo-browser に委譲）
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchPromoBrowser, closePromoBrowser } from "../../scripts/lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const BROWSER_PROFILES = {
  note: path.join(root, "secrets/browser/profile-note"),
  hatena: path.join(root, "secrets/browser/profile-hatena"),
};

/** @param {"note"|"hatena"} service @param {{ headless?: boolean }} opts */
export async function launchLoggedIn(service, opts = {}) {
  const launched = await launchPromoBrowser(service, opts);
  return launched.context;
}

export { launchPromoBrowser, closePromoBrowser };
