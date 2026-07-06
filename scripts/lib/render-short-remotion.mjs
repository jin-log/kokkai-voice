import { spawn } from "node:child_process";
import path from "node:path";

/**
 * @param {{ root: string, propsFile: string, outputMp4: string }} opts
 */
function renderComposition({ root, propsFile, outputMp4, compositionId }) {
  const entry = path.join(root, "remotion", "index.ts");
  const propsPath = propsFile.replace(/\\/g, "/");

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "remotion",
        "render",
        entry,
        compositionId,
        outputMp4,
        `--props=${propsPath}`,
        "--codec=h264",
        "--log=info",
      ],
      { cwd: root, stdio: "inherit", shell: true },
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`remotion render exit ${code}`));
    });
  });
}

/** @param {{ root: string, propsFile: string, outputMp4: string }} opts */
export function renderRemotionShort(opts) {
  return renderComposition({ ...opts, compositionId: "ShortF1" });
}

/** @param {{ root: string, propsFile: string, outputMp4: string }} opts */
export function renderRemotionShortData(opts) {
  return renderComposition({ ...opts, compositionId: "ShortDataV1" });
}
