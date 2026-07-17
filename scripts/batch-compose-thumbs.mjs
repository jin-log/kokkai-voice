/**
 * 公開記事のサムネをテンプレ合成 → output/thumb-review/
 *
 *   node scripts/batch-compose-thumbs.mjs
 *   node scripts/batch-compose-thumbs.mjs --slug kojin-joho-kaisei
 */
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "output/thumb-review");
const articlesDir = path.join(root, "data/articles");

/** @type {Record<string, { file: string, label: string }>} */
const TEMPLATES = {
  gaikokujin: { file: "01-gaikokujin.png", label: "外国人・移民政策" },
  energy: { file: "02-energy.png", label: "エネルギー・インフラ" },
  kyoiku: { file: "03-kyoiku.png", label: "教育" },
  "seiji-kane": { file: "04-seiji-kane.png", label: "政治とカネ・制度" },
  keizai: { file: "05-keizai.png", label: "経済・財政" },
  gaiko: { file: "06-gaiko.png", label: "外交・防衛" },
  shakai: { file: "07-shakai.png", label: "社会保障・くらし" },
  chiho: { file: "08-chiho.png", label: "地方・都政" },
  sonota: { file: "09-sonota-blank.png", label: "その他・時事" },
};

/**
 * thumbCategory 推定（記事 category とは別）
 * @param {{ slug: string, title: string, category?: string }} a
 */
function pickThumbCategory(a) {
  if (a.thumbCategory && TEMPLATES[a.thumbCategory]) return a.thumbCategory;
  const blob = `${a.slug} ${a.title} ${a.category || ""}`;
  const rules = [
    [/外国|移民|不法|滞在|gaikokujin|fuhou|immin/, "gaikokujin"],
    [/エネルギー|原発|再エネ|電気|ガス|太陽光|energy|denki|solar/, "energy"],
    [/教育|無償|教科書|学習|kyoiku|gakushu|デジタル教科書/, "kyoiku"],
    [/政治とカネ|政治資金|献金|日銀|nichigyo|seiji-shikin|ボーナス|国会議員のボーナス/, "seiji-kane"],
    [/防衛|安保|関税|外交|スパイ|国旗|boeei|boei|tariff|mqzxgs3f|mr0jbdpc/, "gaiko"],
    [/年金|介護|医療|少子化|出生|賃上げ|最低賃金|負担率|給付|nenkin|pension|kaigo|shoshika|chingin|kokumin-futan|teigaku/, "shakai"],
    [/地方|都政|大阪|副首都|能登|東京|リコール|chiho|osaka|fukushuto|noto|tokyo|mqwdrley/, "chiho"],
    [/経済|財政|補正|消費税|インボイス|税|万博|カジノ|hosei|shohizei|invoice|zeihikaku|expo|casino|keizai/, "keizai"],
    [/選挙|憲法|岸田|政権|国民会議|個人情報|senkyo|kenpo|kishida|kokumin-kaigi|kojin/, "sonota"],
  ];
  for (const [re, cat] of rules) {
    if (re.test(blob)) return cat;
  }
  return "sonota";
}

function cleanTitle(t) {
  return String(t || "")
    .replace(/^["'「]+|["'」]+$/g, "")
    .replace(/^"|"$/g, "")
    .trim();
}

const args = process.argv.slice(2);
const onlySlug = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

const files = (await readdir(articlesDir)).filter(
  (f) => f.endsWith(".json") && f !== "index.json" && f !== "parked.json",
);

/** @type {object[]} */
const live = [];
for (const f of files) {
  const j = JSON.parse(await readFile(path.join(articlesDir, f), "utf8"));
  const slug = j.slug || f.replace(/\.json$/, "");
  if (onlySlug && slug !== onlySlug) continue;
  if (j.pageReady !== true || j.adminHidden === true) continue;
  const title = cleanTitle(j.title || j.citizenTitle || slug);
  const thumbCategory = pickThumbCategory({ ...j, slug, title });
  live.push({ slug, title, category: j.category || "", thumbCategory });
}

live.sort((a, b) => a.thumbCategory.localeCompare(b.thumbCategory) || a.slug.localeCompare(b.slug));

await mkdir(outDir, { recursive: true });
console.log(`live ${live.length} → ${outDir}`);

const rows = [];
for (const a of live) {
  const tpl = TEMPLATES[a.thumbCategory];
  const outPath = path.join(outDir, `${a.slug}.png`);
  const r = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/compose-og-from-template.mjs"),
      "--slug",
      a.slug,
      "--template",
      tpl.file,
      "--out",
      outPath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error("FAIL", a.slug, r.stderr || r.stdout);
    rows.push({ ...a, template: tpl.file, label: tpl.label, ok: false, err: r.stderr || r.stdout });
    continue;
  }
  const fontLine = (r.stdout || "").split("\n").find((l) => l.startsWith("font "));
  console.log("OK", a.thumbCategory, a.slug, fontLine || "");
  rows.push({ ...a, template: tpl.file, label: tpl.label, ok: true, font: fontLine || "" });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  count: rows.filter((r) => r.ok).length,
  items: rows,
};
await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const byCat = {};
for (const r of rows) {
  if (!byCat[r.thumbCategory]) byCat[r.thumbCategory] = [];
  byCat[r.thumbCategory].push(r);
}

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>サムネチェック ${rows.length}件</title>
<style>
  :root { --bg:#f4f4f2; --ink:#1a1a1a; --muted:#666; --line:#ddd; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; background:var(--bg); color:var(--ink); }
  header { padding:20px 24px; background:#fff; border-bottom:1px solid var(--line); position:sticky; top:0; z-index:2; }
  h1 { margin:0 0 6px; font-size:1.25rem; }
  .meta { color:var(--muted); font-size:.9rem; }
  nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  nav a { font-size:.8rem; padding:4px 10px; background:#eee; border-radius:999px; color:inherit; text-decoration:none; }
  section { padding:16px 24px 32px; }
  h2 { font-size:1rem; margin:24px 0 12px; padding-bottom:6px; border-bottom:2px solid #ccc; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:16px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .card img { width:100%; height:auto; display:block; background:#fff; }
  .card .info { padding:10px 12px 14px; font-size:.85rem; }
  .card .slug { color:var(--muted); font-family: ui-monospace, monospace; font-size:.75rem; }
  .card .title { margin:4px 0 0; font-weight:700; line-height:1.4; }
  .fail { outline:3px solid #c00; }
</style>
</head>
<body>
<header>
  <h1>サムネチェック（アップロード前）</h1>
  <p class="meta">${manifest.count} / ${rows.length} 件 · ${manifest.generatedAt}</p>
  <nav>
    ${Object.keys(byCat)
      .map((k) => `<a href="#cat-${k}">${TEMPLATES[k].label} (${byCat[k].length})</a>`)
      .join("")}
  </nav>
</header>
${Object.entries(byCat)
  .map(
    ([cat, items]) => `
<section id="cat-${cat}">
  <h2>${TEMPLATES[cat].label} <span class="meta">· ${TEMPLATES[cat].file}</span></h2>
  <div class="grid">
    ${items
      .map(
        (r) => `
    <article class="card${r.ok ? "" : " fail"}">
      <img src="./${r.slug}.png" alt="${escapeHtml(r.title)}" loading="lazy"/>
      <div class="info">
        <div class="slug">${r.slug}</div>
        <div class="title">${escapeHtml(r.title)}</div>
      </div>
    </article>`,
      )
      .join("")}
  </div>
</section>`,
  )
  .join("")}
</body>
</html>
`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

await writeFile(path.join(outDir, "index.html"), html);
console.log(`\nindex → ${path.join(outDir, "index.html")}`);
console.log(`fail ${rows.filter((r) => !r.ok).length}`);
