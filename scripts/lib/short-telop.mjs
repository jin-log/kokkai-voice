import sharp from "sharp";

const W = 1080;
const H = 1920;
const FONT = "'Segoe UI','Yu Gothic UI','Meiryo',sans-serif";

/** @type {Record<string, { accent: string, size: number }>} */
const STYLES = {
  hook: { accent: "#f87171", size: 108 },
  question: { accent: "#fbbf24", size: 96 },
  number: { accent: "#38bdf8", size: 102 },
  body: { accent: "#f8fafc", size: 92 },
  cta: { accent: "#60a5fa", size: 90 },
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 縦型テロップPNG — 画面いっぱいの大文字
 * @param {{ lines: string[], style?: string, brand?: string, output: string }} opts
 */
export async function renderTelopOverlay({ lines, style = "body", brand = "日本の政治now.", output }) {
  const s = STYLES[style] ?? STYLES.body;
  const lineHeight = Math.round(s.size * 1.18);
  const blockH = lines.length * lineHeight + 100;
  const blockTop = Math.round((H - blockH) / 2) - 40;
  const startY = blockTop + s.size + 20;
  const padX = 28;

  const tspans = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="540" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${s.size}" font-weight="900" fill="#ffffff" stroke="#020617" stroke-width="7" paint-order="stroke">${esc(line)}</text>`;
    })
    .join("");

  const accentW = style === "hook" ? 10 : 6;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="35%" stop-color="rgba(0,0,0,0.15)"/>
      <stop offset="65%" stop-color="rgba(0,0,0,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect x="${padX}" y="${blockTop}" width="${W - padX * 2}" height="${blockH}" rx="20" fill="rgba(2,6,23,0.78)"/>
  <rect x="${padX}" y="${blockTop}" width="${accentW}" height="${blockH}" rx="20" fill="${s.accent}"/>
  ${tspans}
  <text x="540" y="1860" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="#cbd5e1">${esc(brand)}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(output);
}
