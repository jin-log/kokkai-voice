import { access, readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const FFMPEG = ffmpegPath.path;

/** @param {string[]} args */
export function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/** @param {string} dir */
export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

const STOCK_BG_NAMES = ["bg-news.mp4", "bg-city.mp4"];

const STOCK_BG_VF =
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.1:saturation=0.78:contrast=1.06,unsharp=5:5:0.25:5:5:0.0";

const PROCEDURAL_NEWS_VF = [
  "[1]boxblur=lr=32:cr=32,eq=brightness=-0.3:saturation=0.35[grain]",
  "[0][grain]blend=all_mode=softlight:all_opacity=0.42[base]",
  "[base]zoompan=z='1+0.07*sin(2*PI*on/540)':x='iw/2-(iw/zoom/2)+60*sin(on/140)':y='ih/2-(ih/zoom/2)+38*cos(on/170)':d=1:s=1080x1920:fps=30",
  "eq=brightness=-0.04:saturation=0.88:contrast=1.08",
].join(";");

/**
 * @param {string} root
 * @returns {Promise<string[]>}
 */
export async function listStockClips(root) {
  const dir = path.join(root, "assets", "stock", "clips");
  try {
    const names = await readdir(dir);
    const clips = [];
    for (const name of names) {
      if (!name.toLowerCase().endsWith(".mp4")) continue;
      const p = path.join(dir, name);
      const { size } = await stat(p);
      if (size < 200_000) continue;
      clips.push(p);
    }
    return clips.sort((a, b) => a.localeCompare(b, "en"));
  } catch {
    return [];
  }
}

/**
 * ストック1本をショート用1080x1920に正規化
 * @param {string} srcPath
 * @param {string} outputPath
 * @param {number} [maxSec]
 */
export async function processStockClip(srcPath, outputPath, maxSec = 22) {
  await runFfmpeg([
    "-y",
    "-i",
    srcPath,
    "-vf",
    `${STOCK_BG_VF},fps=30`,
    "-t",
    String(maxSec),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

/** @param {string} root */
async function findStockBg(root) {
  for (const name of STOCK_BG_NAMES) {
    const p = path.join(root, "assets", "stock", name);
    try {
      await access(p);
      const { size } = await stat(p);
      if (size < 200_000) continue;
      return p;
    } catch {
      /* next */
    }
  }
  return null;
}

/** @param {string} workDir */
async function renderProceduralNewsBg(workDir) {
  const bgLoop = path.join(workDir, "bg-loop.mp4");
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0a1424:s=1080x1920:d=90",
    "-f",
    "lavfi",
    "-i",
    "noise=c0s=12:c0f=t:c1s=12:c1f=t:s=1080x1920",
    "-filter_complex",
    PROCEDURAL_NEWS_VF,
    "-t",
    "90",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    bgLoop,
  ]);
  return bgLoop;
}

/**
 * OGP画像 or ストック動画から背景ループ
 * @param {string} root
 * @param {string} workDir
 * @param {string} slug
 */
export async function ensureMotionBackground(root, workDir, slug) {
  const bgLoop = path.join(workDir, "bg-loop.mp4");
  const stockMp4 = await findStockBg(root);

  if (stockMp4) {
    try {
      await runFfmpeg([
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        stockMp4,
        "-vf",
        STOCK_BG_VF,
        "-t",
        "90",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        bgLoop,
      ]);
      return bgLoop;
    } catch {
      /* corrupt stock — fall through */
    }
  }

  try {
    return await renderProceduralNewsBg(workDir);
  } catch (err) {
    throw new Error(
      "背景動画を生成できません。assets/stock/bg-news.mp4 にストック動画を置いてください。",
      { cause: err },
    );
  }
}

/**
 * 無音トリム + テンポ調整
 * @param {string} input
 * @param {string} output
 * @param {number} tempo
 */
export async function trimAndTempoAudio(input, output, tempo = 1.2) {
  await runFfmpeg([
    "-y",
    "-i",
    input,
    "-af",
    `silenceremove=start_periods=1:start_silence=0.01:start_threshold=-42dB:stop_periods=1:stop_silence=0.02:stop_threshold=-42dB,atempo=${tempo}`,
    output,
  ]);
}

/**
 * 1ビート = 背景 + テロップ + 音声（無間）
 */
export async function renderBeatClip({ bgVideo, telopPng, audioMp3, output, offsetSec = 0 }) {
  const filter = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]`,
    `[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]`,
  ].join(";");

  await runFfmpeg([
    "-y",
    "-ss",
    String(offsetSec),
    "-stream_loop",
    "-1",
    "-i",
    bgVideo,
    "-loop",
    "1",
    "-i",
    telopPng,
    "-i",
    audioMp3,
    "-filter_complex",
    filter,
    "-map",
    "[v]",
    "-map",
    "2:a",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    output,
  ]);
}

/** ギャップなし結合（再エンコード） */
export async function concatMp4Tight(segments, output) {
  if (segments.length === 1) {
    await runFfmpeg(["-y", "-i", segments[0], "-c", "copy", output]);
    return;
  }
  const inputs = segments.flatMap((s) => ["-i", s]);
  const n = segments.length;
  const vIn = segments.map((_, i) => `[${i}:v:0]`).join("");
  const aIn = segments.map((_, i) => `[${i}:a:0]`).join("");
  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex",
    `${vIn}concat=n=${n}:v=1:a=0[v];${aIn}concat=n=${n}:v=0:a=1[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    output,
  ]);
}

/** @deprecated */
export async function concatMp4(segments, output) {
  return concatMp4Tight(segments, output);
}

/** @param {string} root @param {string} filename */
export function ogImagePath(root, filename) {
  return path.join(root, "public", "assets", "og", filename);
}
