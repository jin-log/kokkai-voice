#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { WRITER_BATCH10 } from "./writer-batch10-data.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISCLAIMER =
  "AI補助による平易語要約です。解釈を含みます。数字・引用の正本は各出典リンクをご確認ください。国会議事録以外の案件です。";

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const results = [];

for (const [slug, w] of Object.entries(WRITER_BATCH10)) {
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  let article;
  try {
    article = JSON.parse(await readFile(articlePath, "utf8"));
  } catch {
    console.warn(`skip: ${slug}`);
    continue;
  }
  const urls = article.sourceUrls ?? [];

  article.nowSummary = {
    label: "いまの結論",
    bullets: w.nowSummary.bullets,
    disclaimer: DISCLAIMER,
    updatedAt: new Date().toISOString(),
  };
  article.arcSummary = w.arcSummary;
  article.summaryBullets = w.summaryBullets;
  article.plainExplanation = w.plainExplanation;
  article.glossary = w.glossary;
  article.fetchedAt = new Date().toISOString();
  article.publishReady = false;
  article.pageReady = false;
  article.adminHidden = true;

  article.primarySpeech = {
    ...article.primarySpeech,
    ...w.primarySpeech,
    speechID: null,
    issueID: null,
    nameOfHouse: article.category,
    speechURL: urls[0] ?? article.primarySpeech?.speechURL,
    meetingURL: urls[1] ?? null,
    speechFull: null,
  };

  article.timeline = w.timeline.map((t, i) => ({
    id: t.id ?? `${slug}-tl-${i}`,
    type: "source",
    date: t.date,
    summaryPlain: t.summaryPlain,
    sourceUrl: urls[i] ?? urls[0],
  }));

  const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
  const matrix = {
    policySlug: slug,
    policyLabel: article.title ?? slug,
    relatedArticleSlug: slug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v1-writer",
    disclaimer: "党の公式評価ではなく、公言と行動の整理表です。",
    excerpt: { parties: "ライターSkill準拠 batch10", politicians: "" },
    parties: w.matrix.parties.map((p) => ({
      ...p,
      stance: {
        ...p.stance,
        sourceType: "報道・公表",
        capturedAt: new Date().toISOString().slice(0, 10),
      },
      action: {
        ...p.action,
        capturedAt: new Date().toISOString().slice(0, 10),
      },
    })),
  };
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

  article.stanceMatrix = {
    policySlug: slug,
    dataPath: `data/policy-matrix/${slug}.json`,
    disclaimer: "出典付きの事実整理です。",
  };

  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  console.log(`✅ writer applied: ${slug}`);

  await runNode("legal-check.mjs", ["--slug", slug, "--fix"]);
  const code = await runNode("check-case-page.mjs", ["--slug", slug]);
  results.push({ slug, ok: code === 0 });
  if (code !== 0) console.warn(`⚠️ check-case-page: ${slug} exit ${code}`);
}

await import("../src/lib/project-status.mjs").then((m) => m.refreshProjectStatus());
console.log("\n--- batch10 writer ---");
for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.slug}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
