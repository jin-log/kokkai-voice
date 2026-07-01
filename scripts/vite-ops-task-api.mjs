/**
 * ローカル dev 用 POST /api/ops-task-done（data/ へ直接書き込み）
 */
import { completeOpsTask } from "../src/lib/ops-queue-complete.mjs";

/** @returns {import('vite').Plugin} */
export function opsTaskDevApi() {
  return {
    name: "ops-task-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/ops-task-done")) return next();
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const { pin, taskId } = JSON.parse(body || "{}");
            if (pin !== "1192") {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "unauthorized" }));
              return;
            }
            const result = await completeOpsTask(taskId, { by: "owner" });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, message: `完了: ${result.title}`, ...result }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: msg }));
          }
        });
      });
    },
  };
}
