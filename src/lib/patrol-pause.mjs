/**
 * ローカル patrol 一時停止判定
 * - OBS 起動中（配信・録画準備含む）
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** @type {readonly string[]} */
const OBS_PROCESS_NAMES = ["obs64.exe", "obs32.exe", "obs.exe"];

/**
 * @returns {Promise<{ paused: boolean, reason: string|null, detail?: string }>}
 */
export async function getPatrolPauseState() {
  const obs = await isObsRunning();
  if (obs.running) {
    return {
      paused: true,
      reason: "obs",
      detail: obs.processes.join(", "),
    };
  }
  return { paused: false, reason: null };
}

/** @returns {Promise<{ running: boolean, processes: string[] }>} */
export async function isObsRunning() {
  if (process.platform === "win32") {
    return isObsRunningWindows();
  }
  if (process.platform === "darwin") {
    return isObsRunningUnix(["OBS", "OBS Studio"]);
  }
  return isObsRunningUnix(["obs", "obs-studio"]);
}

/** @returns {Promise<{ running: boolean, processes: string[] }>} */
async function isObsRunningWindows() {
  const found = [];
  for (const name of OBS_PROCESS_NAMES) {
    try {
      const { stdout } = await execFileAsync(
        "tasklist",
        ["/FI", `IMAGENAME eq ${name}`, "/NH"],
        { encoding: "utf8", windowsHide: true },
      );
      if (new RegExp(name.replace(".", "\\."), "i").test(stdout)) {
        found.push(name);
      }
    } catch {
      // tasklist unavailable
    }
  }
  return { running: found.length > 0, processes: found };
}

/**
 * @param {string[]} names
 * @returns {Promise<{ running: boolean, processes: string[] }>}
 */
async function isObsRunningUnix(names) {
  const found = [];
  for (const name of names) {
    try {
      await execFileAsync("pgrep", ["-x", name], { encoding: "utf8" });
      found.push(name);
    } catch {
      // not running
    }
  }
  return { running: found.length > 0, processes: found };
}
