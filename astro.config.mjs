// @ts-check
import { defineConfig } from "astro/config";

// Cloudflare Pages: build output → dist/ (see docs/deploy-cloudflare.md)
// Framework preset Astro · Build: npm run build · Output directory: dist
export default defineConfig({
  site: "https://seiji1192.site",
  output: "static",
});
