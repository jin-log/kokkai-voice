import { spawn } from "node:child_process";
import path from "node:path";

/**
 * @param {{ root: string, propsFile: string, outputMp4: string }} opts
 */
export function renderRemotionShort({ root, propsFile, outputMp4 }) {
  const entry = path.join(root, "remotion", "index.ts");
  const propsPath = propsFile.replace(/\\/g, "/");

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "remotion",
        "render",
        entry,
        "ShortF1",
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
