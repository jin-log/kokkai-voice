#!/usr/bin/env node
/** 一般記事の〇×表をメリデメから一括再構成 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGeneralPolicyMatrix } from "../src/lib/general-article.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]
  || (process.argv.includes("--slug") ? process.argv[process.argv.indexOf("--slug") + 1] : null);

async function main() {
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  const slugs = slugArg ? [slugArg] : index.slugs ?? [];
  let fixed = 0;

  for (const slug of slugs) {
    const articlePath = path.join(root, `data/articles/${slug}.json`);
    let article;
    try {
      article = JSON.parse(await readFile(articlePath, "utf8"));
    } catch {
      continue;
    }
    if (article.category === "国会") continue;
    const matrix = buildGeneralPolicyMatrix(article);
    if (!matrix) continue;
    const matrixPath = path.join(root, `data/policy-matrix/${slug}.json`);
    await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
    article.stanceMatrix = {
      policySlug: slug,
      dataPath: `data/policy-matrix/${slug}.json`,
      disclaimer: "出典付きの事実整理です（メリデメベース）。",
    };
    await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    console.log(`[fix] ${slug}`);
    fixed++;
  }
  console.log(`完了: ${fixed}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
