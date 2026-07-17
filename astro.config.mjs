// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { opsTaskDevApi } from "./scripts/vite-ops-task-api.mjs";
import { articleRevisionsDevApi } from "./scripts/vite-article-revisions-api.mjs";
import { ga4ReportDevApi } from "./scripts/vite-ga4-report-api.mjs";

export default defineConfig({
  site: "https://seiji1192.site",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/dev/") &&
        !page.includes("/api/") &&
        !page.includes("/status"),
    }),
  ],
  vite: {
    plugins: [opsTaskDevApi(), articleRevisionsDevApi(), ga4ReportDevApi()],
  },
});
