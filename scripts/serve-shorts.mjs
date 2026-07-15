import { createServer } from "node:http";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../output/shorts/data");
const PORT = 3092;

createServer((req, res) => {
  const file = join(root, req.url === "/" ? "" : req.url);
  try {
    if (existsSync(file) && statSync(file).isFile()) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Access-Control-Allow-Origin", "*");
      createReadStream(file).pipe(res);
    } else {
      const list = readdirSync(root)
        .filter((n) => n.endsWith(".mp4"))
        .map((n) => `<li><a href="/${n}">${n}</a></li>`)
        .join("");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<ul>${list}</ul>`);
    }
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`VIDEO_SERVER_READY http://localhost:${PORT}`));
