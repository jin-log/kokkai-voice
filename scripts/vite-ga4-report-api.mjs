/**
 * ローカル dev 用 GET /api/ga4-report
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGa4Dashboard } from "../functions/lib/ga4-report-core.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const credPath = path.join(root, "secrets/google-service-account.json");

/** @returns {import('vite').Plugin} */
export function ga4ReportDevApi() {
  return {
    name: "ga4-report-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "", "http://localhost");
        if (url.pathname !== "/api/ga4-report") return next();
        if (req.method !== "GET") return send(res, { error: "Method Not Allowed" }, 405);

        try {
          const pin = url.searchParams.get("pin");
          if (pin !== "1192") return send(res, { error: "unauthorized" }, 401);

          const creds = JSON.parse(await readFile(credPath, "utf8"));
          const days = Number(url.searchParams.get("days") || 7);
          const country = url.searchParams.get("country") === "all" ? "all" : "Japan";
          const report = await fetchGa4Dashboard(creds, { days, country });
          return send(res, report);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return send(res, { error: msg }, 500);
        }
      });
    },
  };
}

function send(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}
