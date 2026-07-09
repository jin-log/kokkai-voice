import { readFile, writeFile } from "node:fs/promises";

const files = [
  "create-article.yml",
  "promo-on-publish.yml",
  "marketing-promo-backlog.yml",
  "marketing-hot-single.yml",
  "marketing-daily-digest.yml",
  "admin-article.yml",
  "marketing-weekly.yml",
  "marketing-promo-pack.yml",
  "publish-article.yml",
];

let fixed = 0;
for (const f of files) {
  const path = `.github/workflows/${f}`;
  const src = await readFile(path, "utf8");

  if (src.includes("fetch-depth")) {
    console.log("skip:", f);
    continue;
  }

  // "- uses: actions/checkout@v4" の後に with: fetch-depth: 0 を挿入
  // インデントを自動判定する
  const result = src.replace(
    /^(\s*)(- uses: actions\/checkout@v4)$/gm,
    (match, indent, action) => {
      const withIndent = indent + "  ";
      return `${indent}${action}\n${withIndent}with:\n${withIndent}  fetch-depth: 0`;
    }
  );

  if (result !== src) {
    await writeFile(path, result, "utf8");
    console.log("fixed:", f);
    fixed++;
  } else {
    console.log("no change:", f);
  }
}
console.log("total fixed:", fixed);
