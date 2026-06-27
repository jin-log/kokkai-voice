#!/usr/bin/env node
/**
 * 既存記事の pageReady マイグレーション
 * - ゲートOK & pageReady未設定 → true（既存公開記事）
 * - case-mqwdrley 等 DRAFT_ONLY → false（完成・非公開のまま）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";

const DRAFT_ONLY = new Set(["case-mqwdrley"]);

const index = JSON.parse(
  await readFile(path.join(root, "data/articles/index.json"), "utf8"),
);

let changed = 0;
for (const slug of index.slugs ?? []) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(p, "utf8"));

  if (DRAFT_ONLY.has(slug)) {
    if (article.pageReady !== false) {
      article.pageReady = false;
      await writeFile(p, `${JSON.stringify(article, null, 2)}\n`, "utf8");
      changed++;
      console.log(`${slug}: pageReady=false（非公開プレビュー）`);
    }
    continue;
  }

  if (article.pageReady !== undefined) continue;

  const gate = await checkCasePageWithFiles(article);
  if (gate.ok) {
    article.pageReady = true;
    await writeFile(p, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    changed++;
    console.log(`${slug}: pageReady=true（既存公開）`);
  }
}

console.log(`\n完了: ${changed} 件更新`);
