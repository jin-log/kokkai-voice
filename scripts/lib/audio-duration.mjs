import { spawn } from "node:child_process";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

/**
 * @param {string} file
 * @returns {Promise<number>} seconds
 */
export function getAudioDurationSec(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath.path, ["-hide_banner", "-i", file], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", () => {
      const m = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (!m) {
        reject(new Error(`Duration not found: ${file}`));
        return;
      }
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
  });
}

/**
 * @param {number} sec
 * @param {number} [fps]
 */
export function secToFrames(sec, fps = 30) {
  return Math.max(1, Math.ceil(sec * fps) + 1);
}
