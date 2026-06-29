// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

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
});
