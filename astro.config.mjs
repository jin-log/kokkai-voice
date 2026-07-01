// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { opsTaskDevApi } from "./scripts/vite-ops-task-api.mjs";

export default defineConfig({
  site: "https://seiji1192.site",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/dev/") &&
        !page.includes("/api/") &&
        !page.includes("/status"),
    }),
  ],
  vite: {
    plugins: [opsTaskDevApi()],
  },
});
