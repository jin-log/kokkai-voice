import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function loadAgentsReference() {
  const raw = await readFile(path.join(root, "data/agents-reference.json"), "utf8");
  return JSON.parse(raw);
}
