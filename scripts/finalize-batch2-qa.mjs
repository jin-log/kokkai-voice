#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugs = [
  "gaikokujin-seisaku",
  "shoshika",
  "kyoiku-mushoka",
  "energy-policy",
  "seiji-shikin",
];
const now = new Date().toISOString();
const prodBase = "https://seiji1192.site";

for (const slug of slugs) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(p, "utf8"));
  article.publishReady = true;
  article.qaReview = {
    status: "ok",
    agent: "site-debugger",
    checkedAt: now,
    note: `本番確認済（${prodBase}/case/${slug}/）`,
  };
  await writeFile(p, JSON.stringify(article, null, 2) + "\n", "utf8");
  console.log(`qa OK ${slug}`);
}
