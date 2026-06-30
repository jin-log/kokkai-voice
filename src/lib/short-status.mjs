/**
 * ショート動画の生成・アップロード状態（output/shorts/{slug}/）
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./page-ready.mjs";

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} slug */
export async function loadShortStatus(slug) {
  const outDir = path.join(root, "output", "shorts", slug);
  const videoPath = path.join(outDir, `${slug}-final.mp4`);
  const resultPath = path.join(outDir, "youtube-upload-result.json");

  const generated = await exists(videoPath);
  /** @type {{ slug: string, generated: boolean, uploaded: boolean, visibility: string|null, videoId: string|null, url: string|null, studioUrl: string|null, uploadedAt: string|null, label: string }} */
  const base = {
    slug,
    generated,
    uploaded: false,
    visibility: null,
    videoId: null,
    url: null,
    studioUrl: null,
    uploadedAt: null,
    label: "未生成",
  };

  if (!generated) return base;

  base.label = "生成済・未アップ";

  if (!(await exists(resultPath))) return base;

  try {
    const raw = JSON.parse(await readFile(resultPath, "utf8"));
    base.uploaded = Boolean(raw.videoId);
    base.visibility = raw.visibility ?? null;
    base.videoId = raw.videoId ?? null;
    base.url = raw.url ?? null;
    base.studioUrl = raw.studioUrl ?? null;
    base.uploadedAt = raw.uploadedAt ?? null;

    if (base.uploaded) {
      if (base.visibility === "public") base.label = "YT公開";
      else if (base.visibility === "unlisted") base.label = "YT限定公開";
      else if (base.visibility === "private") base.label = "YT非公開";
      else base.label = "YTアップ済";
    }
  } catch {
    /* ignore */
  }

  return base;
}

/** @param {string[]} slugs */
export async function loadShortStatusMap(slugs) {
  const map = new Map();
  await Promise.all(
    slugs.map(async (slug) => {
      map.set(slug, await loadShortStatus(slug));
    }),
  );
  return map;
}
