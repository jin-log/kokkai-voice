#!/usr/bin/env node
/**
 * timeline speech の summaryPlain をキーワード周辺1文に整形
 * node scripts/improve-timeline-summaries.mjs [--slug X]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { excerptSpeech, scoreSpeechRelevance } from "./lib/kokkai-api.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function improveSummary(text, keyword) {
  if (!text || text.length < 120) return null;
  const body = text.replace(/^[^—]+—\s*/, "").trim();
  const terms = (keyword || "").split(/\s+/).filter(Boolean);
  const sentences = body.split(/。/).map((s) => s.trim()).filter((s) => s.length > 20);
  for (const s of sentences) {
    if (terms.some((t) => s.includes(t)) && s.length <= 120) return s + "。";
  }
  const excerpt = excerptSpeech(body, 100);
  if (excerpt.length >= 40) return excerpt;
  return null;
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

  for (const slug of slugs) {
    const fp = path.join(articlesDir, `${slug}.json`);
    const article = JSON.parse(await readFile(fp, "utf8"));
    const kw = article.searchKeyword || "";
    let n = 0;
    for (const ev of article.timeline || []) {
      if (ev.type !== "speech" || !ev.summaryPlain) continue;
      if (ev.summaryPlain.length < 150) continue;
      const speaker = ev.speech?.speaker;
      const group = ev.speech?.speakerGroup;
      const improved = improveSummary(ev.summaryPlain, kw);
      if (!improved) continue;
      const prefix = speaker
        ? `${speaker}${group ? `（${group}）` : ""}— `
        : "";
      ev.summaryPlain = prefix + improved;
      n++;
    }
    if (n > 0) {
      await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
      console.log(`${slug}: ${n} 件整形`);
    }
  }
}

main();
