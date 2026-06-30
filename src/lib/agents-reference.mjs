import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Astro ビルド時は Vite バンドルで import.meta.url がずれるため cwd 優先 */
async function resolveProjectRoot() {
  const candidates = [process.cwd(), path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")];
  for (const root of candidates) {
    try {
      await access(path.join(root, "data/agents-reference.json"));
      return root;
    } catch {
      /* try next */
    }
  }
  return process.cwd();
}

export async function loadAgentsReference() {
  const root = await resolveProjectRoot();
  const raw = await readFile(path.join(root, "data/agents-reference.json"), "utf8");
  return JSON.parse(raw);
}
