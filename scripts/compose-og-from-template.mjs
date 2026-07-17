/**
 * 白紙テンプレ + タイトル合成
 *
 * 点線ガイド（10）で座標だけ測り、白紙（09）にタイトルのみ描く。
 * 点線は完成画像に出さない。テンプレは一切塗りつぶさない。
 *
 *   node scripts/compose-og-from-template.mjs --slug kojin-joho-kaisei
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fontsDir = path.resolve(__dirname, "assets", "fonts");
process.env.FONTCONFIG_PATH = fontsDir;
process.env.FONTCONFIG_FILE = path.join(fontsDir, "fonts.conf");

const sharp = (await import("sharp")).default;
const { loadArticle } = await import("../src/lib/articles.mjs");

const W = 1200;
const H = 630;
const FONT = "'Noto Sans JP', 'Noto Sans CJK JP', sans-serif";

/**
 * ガイド 1024×536 実測点線: (280,235)-(886,437)
 * → 1200×630。内側パディングで絶対にはみ出さない。
 */
const GUIDE_SRC = { x: 280, y: 235, right: 886, bottom: 437, sw: 1024, sh: 536 };
const PAD_X = 16;
const PAD_Y = 12;
const TITLE_BOX = {
  x: Math.round((GUIDE_SRC.x * W) / GUIDE_SRC.sw) + PAD_X,
  y: Math.round((GUIDE_SRC.y * H) / GUIDE_SRC.sh) + PAD_Y,
  w: Math.round(((GUIDE_SRC.right - GUIDE_SRC.x) * W) / GUIDE_SRC.sw) - PAD_X * 2,
  h: Math.round(((GUIDE_SRC.bottom - GUIDE_SRC.y) * H) / GUIDE_SRC.sh) - PAD_Y * 2,
};

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug");
const templateName = arg("--template") || "09-sonota-blank.png";
const outArg = arg("--out");
const debugBox = args.includes("--debug-box");

if (!slug) {
  console.error("Usage: node scripts/compose-og-from-template.mjs --slug <slug>");
  process.exit(1);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 全角換算幅（英数は0.55） */
function measureWidth(text, fontSize) {
  let w = 0;
  for (const ch of text) {
    w += /[A-Za-z0-9.,size]/.test(ch) ? fontSize * 0.55 : fontSize;
  }
  return w;
}

function wrapToWidth(text, fontSize, maxW, maxLines = 3) {
  const t = String(text).replace(/\s+/g, " ").trim();
  const lines = [];
  let line = "";
  for (const ch of t) {
    const next = line + ch;
    if (measureWidth(next, fontSize) > maxW && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // はみ出し行を切り詰め
  return lines.map((l) => {
    if (measureWidth(l, fontSize) <= maxW) return l;
    let s = l;
    while (s.length > 1 && measureWidth(`${s}…`, fontSize) > maxW) s = s.slice(0, -1);
    return `${s}…`;
  });
}

/** 【】の直後 → 句点優先。単語の途中で割らない */
function wrapTitle(title, fontSize, maxW) {
  const t = String(title).replace(/\s+/g, " ").trim();
  const m = t.match(/^(【[^】]+】)(.*)$/);
  const parts = [];
  if (m && measureWidth(m[1], fontSize) <= maxW) {
    parts.push(m[1]);
    let rest = m[2].trim();
    // 句点単位で積む
    while (rest && parts.length < 3) {
      const hit = rest.match(/^(.+?[。．！？、])(.*)$/);
      if (hit && measureWidth(hit[1], fontSize) <= maxW) {
        parts.push(hit[1]);
        rest = hit[2].trim();
        continue;
      }
      // 残りが1行に入る
      if (measureWidth(rest, fontSize) <= maxW) {
        parts.push(rest);
        rest = "";
        break;
      }
      // どうしても長いときだけ幅折り返し
      const chunk = wrapToWidth(rest, fontSize, maxW, 3 - parts.length);
      parts.push(...chunk);
      rest = "";
    }
    return parts.filter(Boolean).slice(0, 3);
  }
  return wrapToWidth(t, fontSize, maxW, 3);
}

function fitTitle(title) {
  // 最大56（ガイド表記）。行間はサンプルの詰まりに合わせて 1.22
  for (let size = 56; size >= 36; size -= 2) {
    const lineH = Math.round(size * 1.22);
    const lines = wrapTitle(title, size, TITLE_BOX.w);
    const blockH = lines.length * lineH;
    const overflow = lines.some((l) => measureWidth(l, size) > TITLE_BOX.w + 0.5);
    if (!overflow && blockH <= TITLE_BOX.h) {
      return { lines, size, lineH };
    }
  }
  const size = 36;
  const lineH = Math.round(size * 1.22);
  return { lines: wrapTitle(title, size, TITLE_BOX.w), size, lineH };
}

const article = await loadArticle(slug);
const title = String(article.title || article.citizenTitle || slug)
  .replace(/^["'「]+|["'」]+$/g, "")
  .replace(/^"|"$/g, "")
  .trim();
const { lines, size, lineH } = fitTitle(title);

const templatePath = path.join(root, "assets/og-templates", templateName);
const outPath = outArg || path.join(root, "public/assets/og", `${slug}.png`);
await mkdir(path.dirname(outPath), { recursive: true });

// 白紙をそのまま使う（塗りつぶし禁止）
const base = await sharp(templatePath)
  .resize(W, H, { fit: "fill" })
  .png()
  .toBuffer();

const blockH = lines.length * lineH;
const textStartY = TITLE_BOX.y + Math.round((TITLE_BOX.h - blockH) / 2) + size;
const textX = TITLE_BOX.x;

const tspans = lines
  .map(
    (line, i) =>
      `<tspan x="${textX}" y="${textStartY + i * lineH}">${esc(line)}</tspan>`,
  )
  .join("");

const parts = [
  `<text font-family="${FONT}" font-size="${size}" font-weight="700" fill="#1a1a1a">${tspans}</text>`,
];
if (debugBox) {
  // ガイド枠（実測）と内側パディング枠
  const gx = Math.round((GUIDE_SRC.x * W) / GUIDE_SRC.sw);
  const gy = Math.round((GUIDE_SRC.y * H) / GUIDE_SRC.sh);
  const gw = Math.round(((GUIDE_SRC.right - GUIDE_SRC.x) * W) / GUIDE_SRC.sw);
  const gh = Math.round(((GUIDE_SRC.bottom - GUIDE_SRC.y) * H) / GUIDE_SRC.sh);
  parts.unshift(
    `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="none" stroke="#00e676" stroke-width="3"/>`,
    `<rect x="${TITLE_BOX.x}" y="${TITLE_BOX.y}" width="${TITLE_BOX.w}" height="${TITLE_BOX.h}" fill="none" stroke="#ff1744" stroke-width="2"/>`,
  );
}

const overlay = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`,
);

await sharp(base)
  .composite([{ input: overlay, top: 0, left: 0 }])
  .png()
  .toFile(outPath);

// はみ出し検証（タイトル領域外の想定外は出さない＝テキスト幅チェック）
for (const l of lines) {
  const mw = measureWidth(l, size);
  if (mw > TITLE_BOX.w) {
    console.error(`OVERFLOW line "${l}" width=${mw} > ${TITLE_BOX.w}`);
    process.exit(1);
  }
}

console.log(`OK ${outPath}`);
console.log(
  `guide→pad box ${TITLE_BOX.x},${TITLE_BOX.y} ${TITLE_BOX.w}x${TITLE_BOX.h}`,
);
console.log(`font ${size}px (max56) / ${lines.length} lines`);
for (const l of lines) {
  console.log(`  [${Math.round(measureWidth(l, size))}/${TITLE_BOX.w}] ${l}`);
}
