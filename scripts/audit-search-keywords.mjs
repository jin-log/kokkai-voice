#!/usr/bin/env node
/**
 * 汎用 searchKeyword の洗い出し
 * Usage: node scripts/audit-search-keywords.mjs
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 1語だけ・広すぎて手続きノイズになりやすい語 */
const BROAD_SINGLE = new Set([
  "内閣",
  "関税",
  "年金",
  "少子化",
  "介護",
  "外国人",
  "エネルギー",
  "賃上げ",
  "防衛費",
  "裏金",
  "カジノ",
  "補正予算",
]);

/** topics.json の keyword がそのまま記事に入っている＝初期生成のままの疑い */
async function main() {
  const topics = JSON.parse(await readFile(path.join(root, "data/topics.json"), "utf8"));
  const topicBySlug = Object.fromEntries(topics.map((t) => [t.slug, t]));

  const files = (await readdir(path.join(root, "data/articles"))).filter((f) => f.endsWith(".json"));
  const rows = [];

  for (const file of files.sort()) {
    const slug = file.replace(/\.json$/, "");
    const article = JSON.parse(await readFile(path.join(root, "data/articles", file), "utf8"));
    const sk = String(article.searchKeyword || "").trim();
    const topic = topicBySlug[slug];
    const topicKw = topic?.keyword?.trim() || "";
    const hasMulti = Array.isArray(article.searchKeywords) && article.searchKeywords.length > 0;
    const isSingleToken = sk && !/[\s　]/.test(sk);
    const isBroad = BROAD_SINGLE.has(sk);
    const matchesTopicRaw = topicKw && sk === topicKw;
    const flags = [];
    if (sk === "内閣") flags.push("内閣のみ");
    if (isBroad) flags.push("汎用1語");
    if (matchesTopicRaw && isSingleToken) flags.push("topics初期値のまま");
    if (!hasMulti && (isBroad || sk === "内閣")) flags.push("searchKeywords未設定");

    if (flags.length) {
      rows.push({
        slug,
        title: article.title?.slice(0, 40) || "",
        searchKeyword: sk,
        topicKeyword: topicKw,
        searchKeywords: hasMulti ? article.searchKeywords.join(" | ") : "—",
        flags: flags.join(", "),
      });
    }
  }

  const lines = [
    "汎用 searchKeyword 監査 — " + new Date().toISOString().slice(0, 10),
    "",
    `該当 ${rows.length} 件（内閣のみ / 汎用1語 / topics初期値 / searchKeywords未設定）`,
    "",
    "slug\tsearchKeyword\ttopic.keyword\tsearchKeywords\tflags",
    ...rows.map((r) =>
      [r.slug, r.searchKeyword, r.topicKeyword, r.searchKeywords, r.flags].join("\t"),
    ),
    "",
    "対応方針:",
    "- searchKeyword … 話題一致チェック用の代表語（2026時点の核心）",
    "- searchKeywords … API用の複数語（順に叩いて speechID マージ）",
    "- 岸田 辞任 … 2024話・ノイズのため非推奨",
    "- 岸田 退陣 … ヒット3件のみ・歴史文脈。必要なら末尾に",
    "",
    "内閣 のみ: kishida-resign → 対応済（高市内閣 + searchKeywords）",
  ];

  const out = lines.join("\n");
  console.log(out);
  const desktop = path.join(process.env.HOME || "", "Desktop", "searchKeyword-audit.txt");
  await writeFile(desktop, out, "utf8");
  console.log(`\nWrote ${desktop}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
