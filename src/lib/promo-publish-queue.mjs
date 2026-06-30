import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUEUE_PATH = path.join(root, "data/promo-publish-queue.json");

/** @returns {Promise<{ pending: { slug: string, queuedAt: string }[] }>} */
export async function loadPromoPublishQueue() {
  try {
    const raw = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
    return { pending: Array.isArray(raw.pending) ? raw.pending : [] };
  } catch {
    return { pending: [] };
  }
}

/** @param {string} slug */
export async function enqueuePromoPublish(slug) {
  const queue = await loadPromoPublishQueue();
  if (queue.pending.some((p) => p.slug === slug)) return queue;
  queue.pending.push({ slug, queuedAt: new Date().toISOString() });
  await mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  return queue;
}

/** @param {string[]} processedSlugs */
export async function dequeuePromoPublish(processedSlugs) {
  const queue = await loadPromoPublishQueue();
  const done = new Set(processedSlugs);
  queue.pending = queue.pending.filter((p) => !done.has(p.slug));
  await writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}
