#!/usr/bin/env node
/**
 * ShortDataV1 — TTS ナレーション付きショート生成
 *
 * Usage:
 *   npm run short:data:generate
 *   npm run short:data:generate -- --props remotion/props/short-data-default.json --id preview
 *   npm run short:data:generate -- --no-render
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAudioDurationSec, secToFrames } from "./lib/audio-duration.mjs";
import { ensureBgm, mixBgmIntoVideo } from "./lib/short-bgm.mjs";
import {
  NARR_PAD_FRAMES,
  END_LOGO_HOLD_FRAMES,
  narrForEnd,
  narrForHook,
  narrForSlide,
} from "./lib/short-data-narr.mjs";
import { renderRemotionShortData } from "./lib/render-short-remotion.mjs";
import { synthesizeToMp3, voicevoxInstallHint } from "./lib/short-tts.mjs";
import { prepareRemotionBg } from "./lib/prepare-remotion-bg.mjs";
import { stagePropsBgVideos } from "./lib/stage-short-clips.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FPS = 30;

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const propsRel = arg("--props") || "remotion/props/short-data-default.json";
const renderId = arg("--id") || "preview";
const voice = arg("--voice") || "ja-JP-KeitaNeural";
const voicevoxSpeaker = arg("--voicevox-speaker") || process.env.VOICEVOX_SPEAKER || "13";
const noRender = args.includes("--no-render");

async function main() {
  const propsPath = path.join(root, propsRel);
  const base = JSON.parse(await readFile(propsPath, "utf8"));

  await prepareRemotionBg(root);

  const publicDir = path.join(root, "public", ".short-render", `data-${renderId}`);
  await mkdir(publicDir, { recursive: true });

  const engines = [];
  const audioRel = (name) => `.short-render/data-${renderId}/${name}.mp3`;

  async function synthSection(name, text) {
    const local = path.join(publicDir, `${name}.mp3`);
    console.log(`  [tts:${name}] ${text}`);
    const engine = await synthesizeToMp3(text, local, { voice, rate: "+28%" });
    engines.push(engine);
    const dur = await getAudioDurationSec(local);
    const frames = secToFrames(dur, FPS) + NARR_PAD_FRAMES;
    console.log(`    ${engine} | ${dur.toFixed(2)}s → ${frames}f`);
    return { audioSrc: audioRel(name), durationInFrames: frames };
  }

  console.log(`[short-data] id=${renderId} voice=VOICEVOX:${voicevoxSpeaker} (青山龍星) / edge:${voice}`);

  const prevSpeaker = process.env.VOICEVOX_SPEAKER;
  process.env.VOICEVOX_SPEAKER = voicevoxSpeaker;

  const hookAudio = await synthSection("hook", narrForHook(base));

  const slides = [];
  for (let i = 0; i < (base.slides ?? []).length; i++) {
    const slide = base.slides[i];
    const audio = await synthSection(`slide-${i}`, narrForSlide(slide));
    slides.push({ ...slide, ...audio });
  }

  const endAudio = await synthSection("end", narrForEnd(base));
  endAudio.durationInFrames += END_LOGO_HOLD_FRAMES;

  const renderProps = await stagePropsBgVideos(root, {
    ...base,
    hookAudioSrc: hookAudio.audioSrc,
    hookDurationInFrames: hookAudio.durationInFrames,
    slides,
    endAudioSrc: endAudio.audioSrc,
    endDurationInFrames: endAudio.durationInFrames,
    bgVideoSrc: base.bgVideoSrc || "remotion/bg-diet.mp4",
  });

  const renderPropsPath = path.join(root, "remotion", "props", "short-data-render.json");
  await writeFile(renderPropsPath, `${JSON.stringify(renderProps, null, 2)}\n`, "utf8");
  console.log(`[short-data] props → ${path.relative(root, renderPropsPath)}`);

  if (engines.every((e) => !e.startsWith("voicevox"))) {
    console.log(voicevoxInstallHint());
  }

  if (noRender) {
    if (prevSpeaker === undefined) delete process.env.VOICEVOX_SPEAKER;
    else process.env.VOICEVOX_SPEAKER = prevSpeaker;
    return;
  }

  const outDir = path.join(root, "output", "shorts", "data");
  await mkdir(outDir, { recursive: true });
  const rawMp4 = path.join(outDir, `${renderId}-raw.mp4`);
  const outputMp4 = path.join(outDir, `${renderId}.mp4`);

  console.log("[short-data] Remotion render…");
  await renderRemotionShortData({ root, propsFile: renderPropsPath, outputMp4: rawMp4 });

  const workDir = path.join(outDir, `_work-${renderId}`);
  await mkdir(workDir, { recursive: true });
  const bgmPath = await ensureBgm(root, workDir);
  console.log(`[short-data] mix BGM → ${outputMp4}`);
  await mixBgmIntoVideo(rawMp4, bgmPath, outputMp4);

  console.log(`[short-data] done → ${outputMp4}`);

  if (prevSpeaker === undefined) delete process.env.VOICEVOX_SPEAKER;
  else process.env.VOICEVOX_SPEAKER = prevSpeaker;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
