import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EdgeTTS } from "edge-tts-universal";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const FFMPEG = ffmpegPath.path;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VOICEVOX_URL = process.env.VOICEVOX_URL || "http://127.0.0.1:50021";
const VOICEVOX_SPEAKER = Number(process.env.VOICEVOX_SPEAKER || "11");
const VOICEVOX_SPEED = Number(process.env.VOICEVOX_SPEED || "1.2");

/** @returns {Promise<boolean>} */
async function voicevoxAvailable() {
  try {
    const r = await fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * @param {string} text
 * @param {string} wavPath
 */
async function synthesizeVoicevox(text, wavPath) {
  const q = new URL(`${VOICEVOX_URL}/audio_query`);
  q.searchParams.set("text", text);
  q.searchParams.set("speaker", String(VOICEVOX_SPEAKER));
  const queryRes = await fetch(q, { method: "POST" });
  if (!queryRes.ok) throw new Error(`VOICEVOX audio_query ${queryRes.status}`);
  const query = await queryRes.json();
  query.speedScale = VOICEVOX_SPEED;
  query.pitchScale = 0;
  query.intonationScale = 1.08;
  query.prePhonemeLength = 0;
  query.postPhonemeLength = 0;

  const synRes = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${VOICEVOX_SPEAKER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synRes.ok) throw new Error(`VOICEVOX synthesis ${synRes.status}`);
  const { writeFile: wf } = await import("node:fs/promises");
  await wf(wavPath, Buffer.from(await synRes.arrayBuffer()));
}

/**
 * @param {string} text
 * @param {string} mp3Path
 * @param {{ voice?: string, rate?: string }} options
 */
async function synthesizeEdge(text, mp3Path, options) {
  const voice = options.voice || "ja-JP-KeitaNeural";
  const rate = options.rate || "+20%";
  const tts = new EdgeTTS(text, voice, { rate, volume: "+5%" });
  const result = await tts.synthesize();
  const { writeFile: wf } = await import("node:fs/promises");
  await wf(mp3Path, Buffer.from(await result.audio.arrayBuffer()));
}

/** @param {string[]} args */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-1500)}`));
    });
  });
}

/**
 * 優先: VOICEVOX → Edge TTS（SAPIは使わない）
 * @param {string} text
 * @param {string} mp3Path
 * @param {{ voice?: string, rate?: string }} [options]
 * @returns {Promise<string>}
 */
export async function synthesizeToMp3(text, mp3Path, options = {}) {
  const wavPath = mp3Path.replace(/\.mp3$/i, ".wav");

  if (await voicevoxAvailable()) {
    await synthesizeVoicevox(text, wavPath);
    await runFfmpeg([
      "-y",
      "-i",
      wavPath,
      "-af",
      "areverse,silenceremove=start_periods=1:start_silence=0.04:start_threshold=-55dB,areverse",
      "-codec:a",
      "libmp3lame",
      "-qscale:a",
      "3",
      mp3Path,
    ]);
    return `voicevox:${VOICEVOX_SPEAKER}@${VOICEVOX_SPEED}x`;
  }

  await synthesizeEdge(text, mp3Path, options);
  return `edge:${options.voice || "ja-JP-KeitaNeural"}`;
}

export function voicevoxInstallHint() {
  return [
    "推奨: VOICEVOX を起動してから再生成（http://localhost:50021）",
    "https://voicevox.hiroshiba.jp/",
  ].join("\n");
}
