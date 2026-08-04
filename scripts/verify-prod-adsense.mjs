#!/usr/bin/env node
/**
 * 本番URLを直接curlして AdSense指示書バグを一括検証（要約前に生結果を出す）
 * Usage: node scripts/verify-prod-adsense.mjs [--slug senkyo-kaikaku]
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const only = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1]
  : null;

function fetchHtml(url) {
  return execFileSync("curl.exe", ["-sL", "-A", "Mozilla/5.0 verify-prod", url], {
    encoding: "utf8",
    maxBuffer: 20e6,
  });
}

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
}

function sectionText(html, startRe, endRe) {
  const s = html.search(startRe);
  if (s < 0) return "";
  const rest = html.slice(s);
  const e = rest.search(endRe);
  return (e > 0 ? rest.slice(0, e) : rest.slice(0, 4000)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function analyze(slug, html) {
  const title = (html.match(/<title>([^<]+)/) || [])[1] || "";
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
  const ph = (html.match(/本件に関する政府方針を説明/g) || []).length;
  const douryou = (html.match(/の動向/g) || []).length;
  const kosenho = /公選法/.test(html);
  const shihyo = (html.match(/指標\s*[0-9０-９]/g) || []).length;
  const themeGaikoku = /外国人・入管政策/.test(html);
  const themeSeiji = /政治改革・選挙制度/.test(html);

  const gloss = sectionText(html, /glossary-title|この案件の用語/, /<\/section>|id="stance|id="timeline|id="pros/);
  const pros = sectionText(html, /メリット|pros-cons/, /デメリット|demerit|<\/section>/);
  const cons = sectionText(html, /デメリット|demerit/, /<\/section>|id="/);
  const glossHasKosen = /公選法/.test(gloss);
  // crude dup: shared 30-char chunk
  let dup = false;
  const pNorm = pros.replace(/\s/g, "");
  const cNorm = cons.replace(/\s/g, "");
  for (let i = 0; i + 30 < pNorm.length; i += 15) {
    const chunk = pNorm.slice(i, i + 30);
    if (chunk.length >= 30 && cNorm.includes(chunk)) {
      dup = true;
      break;
    }
  }
  const meritHeads = [...html.matchAll(/pros-cons-card__headline[^>]*>([^<]+)/g)].map((m) => m[1]);
  const truncatedHead = meritHeads.some((h) => /[、。]?[0-9０-９a-zA-Zぁ-んァ-ン一-龥]{0,2}$/.test(h) && h.length >= 20 && !/[。．！？)]$/.test(h) && /、$|し、$|を$|に$|は$|が$|と$|、20$/.test(h));

  const statsLabels = [...html.matchAll(/(?:stats|指標|highlight)[^>]*>\s*([^<]{1,40})/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    slug,
    title,
    h1,
    placeholder: ph,
    douryou_hits: douryou,
    kosenho_anywhere: kosenho,
    kosenho_glossary: glossHasKosen,
    proscons_dup: dup,
    shihyoN: shihyo,
    theme_gaikoku: themeGaikoku,
    theme_seiji: themeSeiji,
    merit_heads: meritHeads.slice(0, 3),
    truncated_merit_head: truncatedHead,
    stats_label_sample: statsLabels,
  };
}

const sm = fetchHtml("https://seiji1192.site/sitemap-0.xml");
const slugs = [...new Set([...sm.matchAll(/\/case\/([^/]+)\//g)].map((m) => m[1]))].sort();
const targets = only ? [only] : slugs;

const rows = [];
for (const slug of targets) {
  const url = `https://seiji1192.site/case/${slug}/?v=${Date.now()}`;
  const html = fetchHtml(url);
  const r = analyze(slug, html);
  r.url = url;
  r.bytes = html.length;
  rows.push(r);
  if (only || ["senkyo-kaikaku", "fukushuto-koso", "tokyo-solar-panel", "pension-kuriage-70"].includes(slug)) {
    console.log(`\n===== RAW ${slug} =====`);
    console.log("URL:", url);
    console.log("bytes:", html.length);
    console.log("TITLE:", r.title);
    console.log("H1:", r.h1);
    console.log("placeholder count:", r.placeholder);
    console.log("theme 外国人・入管:", r.theme_gaikoku, "| 政治改革・選挙:", r.theme_seiji);
    console.log("公選法 anywhere/glossary:", r.kosenho_anywhere, r.kosenho_glossary);
    console.log("proscons_dup:", r.proscons_dup);
    console.log("shihyoN:", r.shihyoN);
    console.log("merit_heads:", r.merit_heads);
    console.log("truncated_merit_head:", r.truncated_merit_head);
    // grep lines
    for (const pat of ["政治改革・選挙制度", "外国人・入管政策", "本件に関する政府方針を説明", "公選法", "指標1", "指標2"]) {
      const hits = [...html.matchAll(new RegExp(`.{0,40}${pat}.{0,40}`, "g"))].slice(0, 5);
      console.log(`grep ${pat}:`, hits.length ? "" : "(none)");
      for (const m of hits) console.log(" ", m[0].replace(/\s+/g, " ").slice(0, 140));
    }
  }
}

console.log("\n===== SUMMARY TABLE =====");
console.log(
  ["slug", "ph", "動向", "公選法用語", "メリデメ重複", "指標N", "外国人テーマ", "政治改革テーマ"].join("\t"),
);
let bad = 0;
for (const r of rows) {
  const flag =
    r.placeholder > 0 ||
    r.kosenho_glossary ||
    r.proscons_dup ||
    r.shihyoN > 0 ||
    (r.slug === "senkyo-kaikaku" && r.theme_gaikoku);
  if (flag) bad += 1;
  console.log(
    [
      r.slug,
      r.placeholder,
      r.douryou_hits,
      r.kosenho_glossary ? "Y" : "",
      r.proscons_dup ? "Y" : "",
      r.shihyoN,
      r.theme_gaikoku ? "Y" : "",
      r.theme_seiji ? "Y" : "",
    ].join("\t"),
  );
}
console.log(`\nchecked=${rows.length} flagged=${bad}`);

mkdirSync("tmp", { recursive: true });
const out = path.join("tmp", "verify-prod-adsense.json");
writeFileSync(out, JSON.stringify({ checkedAt: new Date().toISOString(), rows }, null, 2));
console.log("wrote", out);
