#!/usr/bin/env node
/**
 * ショート動画 F1 — Remotion 本番テンプレ（final）
 *
 * Usage:
 *   npm run short:generate -- --slug shoshika
 *   npm run short:generate -- --slug shoshika --no-upload
 *
 * 生成後は既定で YouTube に非公開アップロード（--unlisted / --public / --no-upload で変更）
 */
import { access, copyFile, mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { getAudioDurationSec, secToFrames } from "./lib/audio-duration.mjs";
import { beatsForArticle } from "./lib/short-beats.mjs";
import { ensureBgm, mixBgmIntoVideo } from "./lib/short-bgm.mjs";
import { renderRemotionShort } from "./lib/render-short-remotion.mjs";
import { synthesizeToMp3, voicevoxInstallHint } from "./lib/short-tts.mjs";
import { ensureDir, ensureMotionBackground, listStockClips, processStockClip } from "./lib/short-video.mjs";
import { buildYoutubeUploadDraft } from "./lib/youtube-upload-draft.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FPS = 30;

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug") || "shoshika";
const voice = arg("--voice") || "ja-JP-KeitaNeural";
const version = arg("--version") || "final";
const tempo = Number(arg("--tempo") || "1.2");
const outDir = path.join(root, "output", "shorts", slug);

/** @param {string} root @param {string} sl */
async function preparePublicAssets(root, sl) {
  const publicDir = path.join(root, "public", ".short-render", sl);
  await mkdir(publicDir, { recursive: true });

  /** @type {Record<string, string>} */
  const bgRels = {};
  for (const key of ["hook", "number", "quote", "title"]) {
    const src = path.join(root, "public", "assets", "og", `${sl}-${key}.png`);
    try {
      await access(src);
      const dest = path.join(publicDir, `${key}.png`);
      await copyFile(src, dest);
      bgRels[key] = `.short-render/${sl}/${key}.png`;
    } catch {
      /* skip */
    }
  }

  let logoRel = null;
  const logoSrc = path.join(root, "public", "assets", "logo-header-nihon-seiji-naw.png");
  try {
    await access(logoSrc);
    const dest = path.join(publicDir, "logo.png");
    await copyFile(logoSrc, dest);
    logoRel = `.short-render/${sl}/logo.png`;
  } catch {
    /* skip */
  }

  return { publicDir, bgRels, logoRel };
}

/**
 * @param {string} root
 * @param {string} workDir
 * @param {string} publicDir
 * @param {string} sl
 * @param {import('./lib/short-beats.mjs').ShortBeat[]} beats
 */
async function prepareBeatBackgrounds(root, workDir, publicDir, sl, beats) {
  const clips = await listStockClips(root);
  /** @type {Record<string, string>} */
  const beatVideos = {};

  if (clips.length === 0) {
    console.log("[short] stock clips なし → 単一背景を生成");
    const bgLoopPath = await ensureMotionBackground(root, workDir, sl);
    const publicBg = path.join(publicDir, "bg-loop.mp4");
    await copyFile(bgLoopPath, publicBg);
    const rel = `.short-render/${sl}/bg-loop.mp4`;
    for (const beat of beats) {
      if (beat.style !== "cta") beatVideos[beat.id] = rel;
    }
    return beatVideos;
  }

  let clipIdx = 0;
  for (const beat of beats) {
    if (beat.style === "cta") continue;
    const src = clips[clipIdx % clips.length];
    clipIdx += 1;
    const processed = path.join(workDir, `${beat.id}-bg.mp4`);
    const publicOut = path.join(publicDir, `${beat.id}-bg.mp4`);
    console.log(`  [bg:${beat.id}] ${path.basename(src)}`);
    await processStockClip(src, processed, 25);
    await copyFile(processed, publicOut);
    beatVideos[beat.id] = `.short-render/${sl}/${beat.id}-bg.mp4`;
  }
  return beatVideos;
}

/** @type {Record<string, string>} */
const BEAT_BG_KEY = {
  hook: "hook",
  gap: "number",
  budget: "number",
  rate: "number",
  born: "quote",
  kokkai: "quote",
  why: "quote",
  cta: "hook",
};

async function main() {
  const article = await loadArticle(slug);
  const beats = beatsForArticle(article);
  const category =
    article.searchKeyword?.split(/[\s　]+/)[0] || article.category || slug;

  await ensureDir(outDir);
  const workDir = path.join(outDir, `_work-${version}`);
  await ensureDir(workDir);

  console.log(`[short] slug=${slug} template=Remotion/F1 version=${version} tempo=${tempo}x`);

  const { publicDir, bgRels, logoRel } = await preparePublicAssets(root, slug);
  const fallbackBg = bgRels.hook ?? bgRels.number ?? bgRels.quote;

  console.log("[short] motion background…");
  const beatBgVideos = await prepareBeatBackgrounds(root, workDir, publicDir, slug, beats);

  const engines = [];
  /** @type {import('../remotion/ShortF1.tsx').BeatRender[]} */
  const renderBeats = [];

  for (const beat of beats) {
    const audioPath = path.join(workDir, `${beat.id}.mp3`);
    console.log(`  [${beat.id}] TTS: ${beat.narr}`);
    const engine = await synthesizeToMp3(beat.narr, audioPath, { voice, rate: "+20%", tempo });
    engines.push(engine);
    const publicAudio = path.join(publicDir, `${beat.id}.mp3`);
    await copyFile(audioPath, publicAudio);
    const dur = await getAudioDurationSec(audioPath);
    const bgKey = BEAT_BG_KEY[beat.id] ?? "hook";
    const beatBg = bgRels[bgKey] ?? fallbackBg;
    renderBeats.push({
      id: beat.id,
      style: beat.style,
      telop: beat.telop,
      durationInFrames: secToFrames(dur, FPS),
      audioSrc: `.short-render/${slug}/${beat.id}.mp3`,
      bgImage: beatBg,
      bgVideoSrc: beatBgVideos[beat.id],
    });
    console.log(`    ${engine} | ${dur.toFixed(2)}s → ${renderBeats.at(-1).durationInFrames}f`);
  }

  const props = {
    slug,
    category,
    logoSrc: logoRel,
    beats: renderBeats,
  };

  const propsFile = path.join(workDir, "props.json");
  await writeFile(propsFile, `${JSON.stringify(props, null, 2)}\n`, "utf8");

  const rawMp4 = path.join(outDir, `${slug}-${version}-raw.mp4`);
  console.log(`[short] Remotion render…`);
  await renderRemotionShort({ root, propsFile, outputMp4: rawMp4 });

  const bgmPath = await ensureBgm(root, workDir);
  const outputMp4 = path.join(outDir, `${slug}-${version}.mp4`);
  console.log(`[short] mix BGM → ${outputMp4}`);
  await mixBgmIntoVideo(rawMp4, bgmPath, outputMp4);

  const manifest = {
    slug,
    format: "F1",
    engine: "remotion",
    version,
    generatedAt: new Date().toISOString(),
    tempo,
    voice,
    ttsEngines: [...new Set(engines)],
    voicevoxHint: engines.every((e) => !e.startsWith("voicevox")) ? voicevoxInstallHint() : null,
    output: path.relative(root, outputMp4).replace(/\\/g, "/"),
    beats: renderBeats,
    sources: {
      article: `data/articles/${slug}.json`,
      speechURL: article.primarySpeech?.speechURL ?? null,
    },
    uploadDraft: buildYoutubeUploadDraft(article, {
      videoFile: path.relative(root, outputMp4).replace(/\\/g, "/"),
    }),
  };

  const manifestPath = path.join(outDir, `${slug}-${version}.json`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`[short] done → ${outputMp4}`);

  if (!args.includes("--no-upload")) {
    const uploadArgs = [
      path.join(__dirname, "upload-youtube-short.mjs"),
      "--slug",
      slug,
    ];
    if (args.includes("--public")) {
      /* upload-youtube-short の既定は public */
    } else if (args.includes("--unlisted")) {
      uploadArgs.push("--unlisted");
    } else {
      uploadArgs.push("--private");
    }
    console.log(`[short] upload (${uploadArgs.at(-1) ?? "public"})…`);
    const r = spawnSync(process.execPath, uploadArgs, { cwd: root, stdio: "inherit" });
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
