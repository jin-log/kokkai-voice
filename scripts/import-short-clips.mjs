#!/usr/bin/env node
/**
 * ショート用ストック動画の取り込み
 * - incoming/ → clips/*.mp4（1080x1920向け・そのまま横動画も保持）
 * - manifest 更新
 * - 取り込み元は削除
 */
import { access, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processStockClip, runFfmpeg } from "./lib/short-video.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** @type {Record<string, { slug: string, label: string, tags: string[], use: string }>} */
const KNOWN = {
  "211267_1280x720": {
    slug: "diet-exterior-day",
    label: "国会議事堂・正面（昼）",
    tags: ["国会", "議事堂", "政治"],
    use: "フック・政治全般の背景",
  },
  "46331_1280x720": {
    slug: "flag-waving",
    label: "日の丸・国旗（風になびく）",
    tags: ["国旗", "愛国", "政治"],
    use: "法案・憲法系",
  },
  "127069_1280x720": {
    slug: "justice-gavel",
    label: "正義の女神・法槌",
    tags: ["司法", "法律", "裁判"],
    use: "スパイ防止法・法案系",
  },
  "119023_1280x720": {
    slug: "yen-salary-envelope",
    label: "1万円札・給与袋",
    tags: ["予算", "税金", "給与"],
    use: "予算・歳出・3.6兆円系",
  },
  "63880_1280x720": {
    slug: "newborn-sleeping",
    label: "新生児・寝顔",
    tags: ["少子化", "出生", "子育て"],
    use: "出生率・こども政策",
  },
  "52124_1280x720": {
    slug: "elderly-wheelchair",
    label: "高齢女性・車椅子（笑顔）",
    tags: ["高齢化", "福祉", "介護"],
    use: "社会保障・医療費",
  },
  "838_1280x720": {
    slug: "solar-farm-aerial",
    label: "ソーラーパネル・俯瞰",
    tags: ["エネルギー", "再エネ", "環境"],
    use: "エネルギー政策",
  },
  "91366_1280x720": {
    slug: "worker-hardhat",
    label: "作業服・ヘルメットの女性",
    tags: ["労働", "建設", "インフラ"],
    use: "雇用・公共事業",
  },
  "89256_1280x720": {
    slug: "businessman-suit",
    label: "スーツ男性・指差し（ビジネス）",
    tags: ["経済", "ビジネス"],
    use: "経済指標・企業（人物が入るので控えめに）",
  },
  "102539_1280x720": {
    slug: "train-rural",
    label: "ローカル線・山間（夏）",
    tags: ["交通", "地方"],
    use: "地方創生・インフラ（政治色は薄め）",
  },
  "study-school-student": {
    slug: "study-school-student",
    label: "勉強・学校・学生",
    tags: ["教育", "学校", "学生", "大学"],
    use: "教育政策・無償化・教科書",
  },
  "solar-energy-field": {
    slug: "solar-energy-field",
    label: "太陽光・エネルギー",
    tags: ["エネルギー", "太陽光", "再エネ", "環境"],
    use: "エネルギー政策・再エネ",
  },
  "elderly-care": {
    slug: "elderly-care",
    label: "介護・高齢",
    tags: ["介護", "高齢化", "福祉", "社会保障"],
    use: "介護・年金・医療",
  },
  "osaka-castle": {
    slug: "osaka-castle",
    label: "大阪城",
    tags: ["大阪", "大阪都構想", "地方", "都市"],
    use: "大阪都構想・関西",
  },
  "spy-hoodie": {
    slug: "spy-hoodie",
    label: "スパイ・フード",
    tags: ["スパイ", "スパイ防止法", "治安", "司法"],
    use: "スパイ防止法・治安",
  },
  "politician-speech": {
    slug: "politician-speech",
    label: "演説・政治家",
    tags: ["国会", "政治家", "演説", "選挙"],
    use: "政治・選挙・演説",
  },
  "illegal-overstay": {
    slug: "illegal-overstay",
    label: "不法滞在・入管",
    tags: ["不法移民", "入管", "在留外国人", "移民"],
    use: "入管・在留政策",
  },
  // 2026-07-18 追加バッチ
  "forest-river-aerial": {
    slug: "forest-river-aerial",
    label: "森・渓流（俯瞰・縦）",
    tags: ["自然", "環境", "地方"],
    use: "環境・地方（抽象背景）",
  },
  "tokyo-skytree-bridge-night": {
    slug: "tokyo-skytree-bridge-night",
    label: "スカイツリー・隅田川夜景",
    tags: ["東京", "都市", "夜景", "インフラ"],
    use: "東京・都市政策",
  },
  "tokyo-highway-night": {
    slug: "tokyo-highway-night",
    label: "都市高速・夜景（縦）",
    tags: ["都市", "交通", "夜景", "東京"],
    use: "都市・インフラ",
  },
  "tokyo-skytree-street-night": {
    slug: "tokyo-skytree-street-night",
    label: "スカイツリー・街路夜景",
    tags: ["東京", "夜景", "都市"],
    use: "東京案件",
  },
  "tokyo-skyline-dusk": {
    slug: "tokyo-skyline-dusk",
    label: "都市夕暮れ・高速",
    tags: ["都市", "東京", "夕暮れ", "経済"],
    use: "経済・都市全般",
  },
  "tokyo-gov-sakura": {
    slug: "tokyo-gov-sakura",
    label: "都庁・桜（縦）",
    tags: ["東京", "都政", "桜", "地方自治"],
    use: "都政・リコール・都の政策",
  },
  "nyc-chrysler-nightwalk": {
    slug: "nyc-chrysler-nightwalk",
    label: "NYC夜・歩道（縦）",
    tags: ["海外", "都市", "夜景"],
    use: "海外・関税等（控えめ）",
  },
  "mountain-bike-trail": {
    slug: "mountain-bike-trail",
    label: "マウンテンバイク（縦）",
    tags: ["スポーツ", "アウトドア"],
    use: "用途薄め・控えめで",
  },
  "diet-building-front": {
    slug: "diet-building-front",
    label: "国会議事堂・正面（青空）",
    tags: ["国会", "議事堂", "政治"],
    use: "政治全般フック",
  },
  "yen-symbols-falling": {
    slug: "yen-symbols-falling",
    label: "円マーク落下（抽象）",
    tags: ["円", "経済", "抽象", "予算"],
    use: "物価・予算・税金",
  },
  "global-markets-globe": {
    slug: "global-markets-globe",
    label: "地球儀・株チャート",
    tags: ["経済", "市場", "国際"],
    use: "関税・経済指標",
  },
  "stock-chart-neon": {
    slug: "stock-chart-neon",
    label: "株チャート・ネオン",
    tags: ["経済", "市場", "抽象"],
    use: "経済・物価",
  },
  "report-chart-hand": {
    slug: "report-chart-hand",
    label: "報告書・グラフ手元",
    tags: ["経済", "データ", "統計"],
    use: "統計・試算説明",
  },
  "desk-planning-flatlay": {
    slug: "desk-planning-flatlay",
    label: "デスク・計画ミーティング",
    tags: ["ビジネス", "企画"],
    use: "政策議論・会議感（薄め）",
  },
  "gas-station-neon-anime": {
    slug: "gas-station-neon-anime",
    label: "ガソリンスタンド夜（イラスト）",
    tags: ["エネルギー", "ガソリン"],
    use: "ガソリン・エネルギー（雰囲気）",
  },
  "supermarket-aisle-blur": {
    slug: "supermarket-aisle-blur",
    label: "スーパー店内・ぼかし",
    tags: ["物価", "消費", "スーパー"],
    use: "物価高・家計",
  },
  "supermarket-shopper-mask": {
    slug: "supermarket-shopper-mask",
    label: "スーパー買い物・食品確認",
    tags: ["物価", "消費", "食料"],
    use: "物価高・食料品",
  },
};

/**
 * @param {string} src
 * @param {string} dest
 */
async function toMp4(src, dest) {
  if (src.toLowerCase().endsWith(".mp4")) {
    await rename(src, dest);
    return;
  }
  await runFfmpeg([
    "-y",
    "-i",
    src,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    dest,
  ]);
  await rm(src, { force: true });
}

async function main() {
  const incoming = path.join(root, "assets", "stock", "clips", "incoming");
  const clipsDir = path.join(root, "assets", "stock", "clips");
  const vertDir = path.join(root, "assets", "stock", "clips", "vertical");
  await mkdir(incoming, { recursive: true });
  await mkdir(clipsDir, { recursive: true });
  await mkdir(vertDir, { recursive: true });

  const names = await readdir(incoming);
  const files = names.filter((n) => /\.(mp4|mov)$/i.test(n));
  if (files.length === 0) {
    console.log("[import-clips] incoming にファイルなし");
    return;
  }

  /** @type {object[]} */
  const manifest = [];
  const manifestPath = path.join(root, "data", "short-stock-clips.json");
  try {
    const prev = JSON.parse(await readFile(manifestPath, "utf8"));
    if (Array.isArray(prev.clips)) manifest.push(...prev.clips);
  } catch {
    /* new */
  }

  for (const name of files.sort()) {
    const base = name.replace(/\.(mp4|mov)$/i, "");
    const meta = KNOWN[base];
    const slug = meta?.slug ?? base.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const src = path.join(incoming, name);
    const horiz = path.join(clipsDir, `${slug}.mp4`);
    const vert = path.join(vertDir, `${slug}-vert.mp4`);

    console.log(`[import-clips] ${name} → ${slug}`);
    await toMp4(src, horiz);
    await processStockClip(horiz, vert, 25);

    const { size } = await stat(horiz);
    const entry = {
      id: slug,
      sourceFile: name,
      label: meta?.label ?? slug,
      tags: meta?.tags ?? [],
      use: meta?.use ?? "",
      horizontal: path.relative(root, horiz).replace(/\\/g, "/"),
      vertical: path.relative(root, vert).replace(/\\/g, "/"),
      bytes: size,
      importedAt: new Date().toISOString(),
    };
    const idx = manifest.findIndex((c) => c.id === slug);
    if (idx >= 0) manifest[idx] = entry;
    else manifest.push(entry);
  }

  const out = {
    updatedAt: new Date().toISOString(),
    clips: manifest.sort((a, b) => a.id.localeCompare(b.id, "en")),
  };
  await writeFile(manifestPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`[import-clips] manifest → data/short-stock-clips.json (${manifest.length}本)`);

  // Remotion プレビュー用メイン背景（国会議事堂）
  const dietVert = path.join(vertDir, "diet-exterior-day-vert.mp4");
  const publicBg = path.join(root, "public", "remotion", "bg-diet.mp4");
  try {
    await access(dietVert);
    await mkdir(path.dirname(publicBg), { recursive: true });
    const { copyFile } = await import("node:fs/promises");
    await copyFile(dietVert, publicBg);
    console.log("[import-clips] preview bg → public/remotion/bg-diet.mp4");
  } catch {
    /* diet clip missing */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
