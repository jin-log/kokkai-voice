#!/usr/bin/env node
/**
 * 1行目×タイトル不一致で停滞中の記事だけ、簡素タイトルを適用し結論1行目を合わせる。
 * 既に1行目OKの記事はタイトルも本文も触らない。
 *
 * Usage: node scripts/apply-stalled-titles.mjs [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessTitleOpeningAnswer } from "../src/lib/publish-policy.mjs";
import {
  STALLED_SIMPLE_TITLES,
  simplifyBracketTitle,
  TITLE_BRUSHUP,
} from "../src/lib/title-format.mjs";
import { loadArticle } from "../src/lib/articles.mjs";
import {
  finalizeNowBulletsForTitle,
  synthesizePlainExplanation,
} from "./lib/writer-synthesize.mjs";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));

function simpleTitleFor(slug, article) {
  if (STALLED_SIMPLE_TITLES[slug]) return STALLED_SIMPLE_TITLES[slug];
  const brush = TITLE_BRUSHUP[slug];
  if (brush) return simplifyBracketTitle(brush);
  return simplifyBracketTitle(article.title || slug);
}

let updated = 0;
let skipped = 0;

for (const slug of index.slugs ?? []) {
  const article = await loadArticle(slug);
  const before = assessTitleOpeningAnswer(article);
  if (before.ok) {
    skipped++;
    continue;
  }

  const newTitle = simpleTitleFor(slug, article);
  const bullets = finalizeNowBulletsForTitle(
    article.nowSummary?.bullets ?? [],
    newTitle,
    article.searchKeyword || "",
    { arcSummary: article.arcSummary },
  );

  article.title = newTitle;
  article.nowSummary = {
    ...(article.nowSummary ?? {}),
    bullets,
    updatedAt: new Date().toISOString(),
  };
  const meta = {
    date: article.primarySpeech?.date,
    nameOfHouse: article.primarySpeech?.nameOfHouse,
    speaker: article.primarySpeech?.speaker,
  };
  article.plainExplanation = synthesizePlainExplanation(bullets, newTitle, meta);

  const after = assessTitleOpeningAnswer(article);
  console.log(
    `${dryRun ? "DRY" : "OK "} ${slug}\n  タイトル: ${newTitle}\n  1行目: ${(bullets[0] || "").slice(0, 80)}\n  ${before.id} → ${after.ok ? "OK" : after.id}`,
  );

  if (!dryRun) {
    await writeFile(
      path.join(root, "data/articles", `${slug}.json`),
      `${JSON.stringify(article, null, 2)}\n`,
      "utf8",
    );
    updated++;
  }
}

if (!dryRun) {
  await refreshProjectStatus();
  console.log(`\n更新 ${updated} 件 / スキップ（1行目OK） ${skipped} 件`);
} else {
  console.log(`\n(dry-run)`);
}
