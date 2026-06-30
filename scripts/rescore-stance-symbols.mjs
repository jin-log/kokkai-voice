#!/usr/bin/env node
/**
 * 〇×記号 v2 へ再採点（policy-matrix のみ。記事JSON・公開ゲートは触らない）
 *
 *   node scripts/rescore-stance-symbols.mjs --batch 1
 *   node scripts/rescore-stance-symbols.mjs --batch 2
 *   node scripts/rescore-stance-symbols.mjs --slug gaikokujin-seisaku
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scorePartySymbol, SYMBOL_METHODOLOGY } from "../src/lib/symbol-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrixDir = path.join(root, "data/policy-matrix");
const batchesPath = path.join(root, "data/symbol-rescore-batches.json");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const batchArg = arg("batch");
const slugArg = arg("slug");

async function loadBatches() {
  return JSON.parse(await readFile(batchesPath, "utf8"));
}

async function rescoreSlug(slug) {
  const file = path.join(matrixDir, `${slug}.json`);
  let matrix;
  try {
    matrix = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return { slug, ok: false, error: "matrix なし" };
  }

  const parties = matrix.parties ?? [];
  if (!parties.length) return { slug, ok: false, error: "parties 空" };

  let changed = 0;
  for (const p of parties) {
    const { symbol, symbolReason } = scorePartySymbol(p);
    if (p.symbol !== symbol || p.symbolReason !== symbolReason) {
      changed++;
      p.symbol = symbol;
      p.symbolReason = symbolReason;
    }
  }

  matrix.methodologyVersion = SYMBOL_METHODOLOGY;
  matrix.updatedAt = new Date().toISOString();
  await writeFile(file, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  return {
    slug,
    ok: true,
    changed,
    symbols: parties.map((p) => `${p.partyLabel}:${p.symbol}`).join(", "),
  };
}

async function main() {
  let slugs = [];
  if (slugArg) {
    slugs = [slugArg];
  } else if (batchArg) {
    if (batchArg === "all") {
      console.error("禁止: --batch all は使わない。1,2,3… を指定");
      process.exit(1);
    }
    const n = Number(batchArg);
    const cfg = await loadBatches();
    slugs = cfg.batches[n - 1];
    if (!slugs?.length) {
      console.error(`バッチ ${batchArg} が未定義（${cfg.batches.length} バッチまで）`);
      process.exit(1);
    }
    console.log(`=== 記号 v2 再採点 バッチ ${batchArg} (${slugs.length}件) ===\n`);
  } else {
    console.error("必須: --batch N または --slug X");
    process.exit(1);
  }

  const results = [];
  for (const slug of slugs) {
    results.push(await rescoreSlug(slug));
  }

  for (const r of results) {
    if (r.ok) {
      console.log(`OK ${r.slug}: ${r.changed}党更新 [${r.symbols}]`);
    } else {
      console.log(`SKIP ${r.slug}: ${r.error}`);
    }
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n完了 ${ok}/${results.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
