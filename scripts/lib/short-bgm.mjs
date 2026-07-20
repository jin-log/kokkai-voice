import { access } from "node:fs/promises";
import path from "node:path";
import { getAudioDurationSec } from "./audio-duration.mjs";
import { runFfmpeg } from "./short-video.mjs";

/**
 * BGM — assets/stock/bgm-news.mp3 があればそれ、なければ生成
 * @param {string} root
 * @param {string} workDir
 */
export async function ensureBgm(root, workDir) {
  const bundled = path.join(root, "assets", "stock", "bgm-news.mp3");
  const out = path.join(workDir, "bgm.mp3");

  try {
    await access(bundled);
    return bundled;
  } catch {
    /* generate */
  }

  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=146.83:duration=120",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:duration=120",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=277.18:duration=120",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=pink:duration=120:amplitude=0.006",
    "-filter_complex",
    "[0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest,volume=0.18,lowpass=f=1400,highpass=f=90,afade=t=in:st=0:d=1",
    "-t",
    "120",
    out,
  ]);
  return out;
}

/**
 * 映像尺に合わせて BGM をループ。足りない場合は必ず stream_loop。
 * フェードアウトは映像終端付近（固定18秒フェードは禁止）。
 * @param {string} videoPath
 * @param {string} bgmPath
 * @param {string} output
 * @param {number} [bgmVol]
 */
export async function mixBgmIntoVideo(videoPath, bgmPath, output, bgmVol = 0.14) {
  const videoDur = await getAudioDurationSec(videoPath);
  const fadeDur = 1.5;
  const fadeOutStart = Math.max(0, Number((videoDur - fadeDur).toFixed(3)));

  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-stream_loop",
    "-1",
    "-i",
    bgmPath,
    "-filter_complex",
    `[1:a]volume=${bgmVol},afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOutStart}:d=${fadeDur}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]`,
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    output,
  ]);
}
