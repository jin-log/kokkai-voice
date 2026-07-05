import { access, copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Remotion staticFile 用に背景動画を public/ へコピー
 * @param {string} root
 * @param {string | undefined} srcRel
 * @param {Map<string, string>} cache
 * @returns {Promise<string | undefined>}
 */
export async function stageBgVideo(root, srcRel, cache = new Map()) {
  if (!srcRel) return srcRel;
  if (cache.has(srcRel)) return cache.get(srcRel);

  const publicFile = path.join(root, "public", srcRel);
  try {
    await access(publicFile);
    cache.set(srcRel, srcRel);
    return srcRel;
  } catch {
    /* copy into public */
  }

  const base = path.basename(srcRel);
  const destRel = `remotion/clips/${base}`;
  const destAbs = path.join(root, "public", destRel);

  try {
    const { size } = await stat(destAbs);
    if (size > 100_000) {
      cache.set(srcRel, destRel);
      return destRel;
    }
  } catch {
    /* create */
  }

  const srcAbs = path.join(root, srcRel);
  try {
    await access(srcAbs);
  } catch {
    console.warn(`[stage-clips] missing: ${srcRel} → fallback bg-diet.mp4`);
    cache.set(srcRel, "remotion/bg-diet.mp4");
    return "remotion/bg-diet.mp4";
  }

  await mkdir(path.dirname(destAbs), { recursive: true });

  try {
    await copyFile(srcAbs, destAbs);
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === "EBUSY") {
      try {
        await access(destAbs);
        cache.set(srcRel, destRel);
        return destRel;
      } catch {
        /* fall through */
      }
    }
    throw err;
  }

  cache.set(srcRel, destRel);
  return destRel;
}

/**
 * @param {string} root
 * @param {Record<string, unknown>} props
 */
export async function stagePropsBgVideos(root, props) {
  const cache = new Map();
  const out = { ...props };

  out.hookBgVideoSrc = await stageBgVideo(root, props.hookBgVideoSrc, cache);
  out.bgVideoSrc = await stageBgVideo(root, props.bgVideoSrc, cache);
  if (props.endBgVideoSrc) {
    out.endBgVideoSrc = await stageBgVideo(root, props.endBgVideoSrc, cache);
  }

  if (Array.isArray(props.slides)) {
    const slides = [];
    for (const slide of props.slides) {
      slides.push({
        ...slide,
        bgVideoSrc: slide.bgVideoSrc
          ? await stageBgVideo(root, slide.bgVideoSrc, cache)
          : slide.bgVideoSrc,
      });
    }
    out.slides = slides;
  }

  return out;
}
