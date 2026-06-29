import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @returns {Promise<import('./shorts-benchmarks.mjs').ShortsBenchmarks>} */
export async function loadShortsBenchmarks() {
  const raw = await readFile(path.join(root, "data/shorts-benchmarks.json"), "utf8");
  return JSON.parse(raw);
}

/** @typedef {{ title?: string; url: string; hook?: string; why?: string; cta?: string; durationSec?: number; channel?: string }} BenchmarkEntry */
/** @typedef {{ label: string; description: string; examples: BenchmarkEntry[] }} FormatDef */
/** @typedef {{ id: string; auto: boolean; risk: string; use: string }} MaterialItem */
/** @typedef {{ updatedAt: string|null; status?: string; note: string; selection_checklist?: string[]; formats: Record<string, FormatDef>; material_stack?: MaterialItem[]; channels_for_structure_only?: { name: string; url: string|null; learn: string }[]; reject: string[] }} ShortsBenchmarks */

export function listFormats(data) {
  if (!data?.formats) return [];
  return Object.entries(data.formats).map(([id, def]) => ({
    id,
    label: def.label ?? id,
    description: def.description ?? "",
    items: def.examples ?? [],
  }));
}
