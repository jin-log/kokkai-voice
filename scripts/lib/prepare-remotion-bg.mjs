import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ensureMotionBackground,
  listStockClips,
  processStockClip,
} from "./short-video.mjs";

/**
 * Remotion プレビュー用 — 国会系暗め背景を public/remotion/ に用意
 * @param {string} root
 */
export async function prepareRemotionBg(root) {
  const outDir = path.join(root, "public", "remotion");
  const outMp4 = path.join(outDir, "bg-diet.mp4");
  await mkdir(outDir, { recursive: true });

  try {
    await access(outMp4);
    return outMp4;
  } catch {
    /* generate */
  }

  const clips = await listStockClips(root);
  if (clips.length > 0) {
    await processStockClip(clips[0], outMp4, 30);
    return outMp4;
  }

  const tmp = path.join(root, "output", ".remotion-preview");
  await mkdir(tmp, { recursive: true });
  await ensureMotionBackground(root, tmp, "preview");
  const { copyFile } = await import("node:fs/promises");
  await copyFile(path.join(tmp, "bg-loop.mp4"), outMp4);
  return outMp4;
}
