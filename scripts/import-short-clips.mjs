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
