#!/usr/bin/env node
/**
 * OGP 画像生成（1200×630）— X / note シェア用
 * パターン: title | hook | quote | number
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getArticleSlugs, loadArticle } from "../src/lib/articles.mjs";
import { articleShortTitle } from "../src/lib/case-helpers.mjs";
import { SITE } from "../src/lib/site-config.mjs";
import { pickOgPattern, extractOgNumber } from "../src/lib/og-image.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "public", "assets");
const ogDir = path.join(assets, "og");

const W = 1200;
const H = 630;
const FONT = "'Segoe UI','Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(text, maxChars = 22, maxLines = 3) {
  const t = String(text).replace(/\s+/g, " ").trim();
  const lines = [];
  let line = "";
  for (const ch of t) {
    if (line.length >= maxChars) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && t.length > lines.join("").length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxChars - 1) + "…";
  }
  return lines;
}

function wrapBody(text, maxChars = 28, maxLines = 4) {
  return wrapTitle(text, maxChars, maxLines);
}

function footerSvg() {
  return `
  <text x="80" y="500" font-family="${FONT}" font-size="30" fill="#64748b">出典付きで追う — あの話どうなった？</text>
  <text x="80" y="555" font-family="${FONT}" font-size="24" fill="#94a3b8">seiji1192.site</text>`;
}

function brandBar(color = "#1e40af") {
  return `<rect width="${W}" height="10" fill="${color}"/>`;
}

function brandLabel(y = 120) {
  return `<text x="80" y="${y}" font-family="${FONT}" font-size="28" font-weight="700" fill="#1e40af">${esc(SITE.name)}</text>`;
}

function bodyText(lines, startY, fontSize = 48, color = "#0f172a") {
  const lineHeight = Math.round(fontSize * 1.2);
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="80" y="${startY + i * lineHeight}" font-size="${fontSize}" font-weight="700" fill="${color}">${esc(line)}</tspan>`,
    )
    .join("");
  return `<text font-family="${FONT}">${tspans}</text>`;
}

function baseSvg({ barColor, inner }) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#f8fbff"/>
  ${brandBar(barColor)}
  ${brandLabel()}
  ${inner}
  ${footerSvg()}
</svg>`);
}

function svgTitle(titleLines) {
  return baseSvg({
    barColor: "#1e40af",
    inner: bodyText(titleLines, 220, 52),
  });
}

function svgHook(hookLines) {
  return baseSvg({
    barColor: "#ca8a04",
    inner: `
  <text x="80" y="175" font-family="${FONT}" font-size="26" font-weight="700" fill="#ca8a04">今の論点</text>
  ${bodyText(hookLines, 230, 46)}`,
  });
}

function svgQuote(speaker, quoteLines) {
  return baseSvg({
    barColor: "#475569",
    inner: `
  <text x="80" y="175" font-family="${FONT}" font-size="26" font-weight="700" fill="#475569">国会での発言</text>
  <text x="80" y="210" font-family="${FONT}" font-size="24" fill="#64748b">${esc(speaker)}</text>
  ${bodyText(quoteLines, 270, 40, "#1e293b")}`,
  });
}

function svgNumber(highlight, contextLines) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0f172a"/>
  ${brandBar("#ca8a04")}
  <text x="80" y="115" font-family="${FONT}" font-size="28" font-weight="700" fill="#93c5fd">${esc(SITE.name)}</text>
  <text x="80" y="310" font-family="${FONT}" font-size="120" font-weight="800" fill="#fbbf24">${esc(highlight)}</text>
  ${bodyText(contextLines, 400, 36, "#e2e8f0")}
  <text x="80" y="555" font-family="${FONT}" font-size="24" fill="#64748b">seiji1192.site · 出典付き</text>
</svg>`);
}

function cleanQuote(excerpt) {
  return excerpt
    .replace(/\s+/g, " ")
    .replace(/^[○◎▲▼■□◆◇]+/, "")
    .replace(/（.*?）/g, "")
    .trim()
    .slice(0, 120);
}

/** @param {import('../src/lib/articles.mjs').Article} article @param {string} pattern */
export function buildOgSvg(article, pattern) {
  const title = articleShortTitle(article);
  const bullet = article.nowSummary?.bullets?.[0] || "";

  if (pattern === "number") {
    const num = extractOgNumber(bullet) || "？";
    const ctx = wrapBody(bullet.replace(num, "").trim() || title, 24, 2);
    return svgNumber(num, ctx.length ? ctx : wrapTitle(title, 20, 2));
  }
  if (pattern === "quote") {
    const speaker = article.primarySpeech?.speaker || "国会議員";
    const quote = cleanQuote(article.primarySpeech?.excerpt || bullet);
    return svgQuote(speaker, wrapBody(quote, 26, 3));
  }
  if (pattern === "hook") {
    return svgHook(wrapBody(bullet || title, 26, 3));
  }
  return svgTitle(wrapTitle(title));
}

async function renderSvg(svgBuffer, outPath) {
  await sharp(svgBuffer).png().toFile(outPath);
}

async function composeDefaultOg(outPath) {
  const logo = await sharp(path.join(assets, "logo-nihon-seiji-naw.png"))
    .resize(920, null)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 248, g: 251, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="${W}" height="${H}">${brandBar()}</svg>`),
        top: 0,
        left: 0,
      },
      { input: logo, gravity: "center" },
    ])
    .png()
    .toFile(outPath);
}

/** @param {import('../src/lib/articles.mjs').Article} article */
async function generateCaseOgs(article, slug) {
  const primary = pickOgPattern(article);
  const patterns = new Set([primary, "title", "hook", "quote", "number"]);

  for (const pattern of patterns) {
    const suffix = pattern === primary ? "" : `-${pattern}`;
    const outPath = path.join(ogDir, `${slug}${suffix}.png`);
    await renderSvg(buildOgSvg(article, pattern), outPath);
  }
  return primary;
}

async function main() {
  await mkdir(ogDir, { recursive: true });
  await composeDefaultOg(path.join(assets, "og-default.png"));
  console.log("OK og-default.png");

  const slugArg = (() => {
    const i = process.argv.indexOf("--slug");
    return i >= 0 ? process.argv[i + 1] : null;
  })();

  const slugs = slugArg ? [slugArg] : await getArticleSlugs();
  const stats = { title: 0, hook: 0, quote: 0, number: 0 };
  let n = 0;

  for (const slug of slugs) {
    const article = await loadArticle(slug);
    if (!slugArg && (article.adminHidden || !article.pageReady)) continue;
    const primary = await generateCaseOgs(article, slug);
    stats[primary] = (stats[primary] || 0) + 1;
    n++;
  }

  console.log(`OK og/${n} cases × 5 variants`);
  console.log(`  primary: title=${stats.title} hook=${stats.hook} quote=${stats.quote} number=${stats.number}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
