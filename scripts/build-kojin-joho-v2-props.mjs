/**
 * 個人情報保護法ショート V2 — 情報タグ読み上げ props 生成
 *   node scripts/build-kojin-joho-v2-props.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const tags = [
  "氏名",
  "住所",
  "生年月日",
  "電話番号",
  "メール",
  "マイナンバー",
  "顔写真",
  "収入",
  "預貯金",
  "不動産",
  "融資",
  "購買履歴",
  "クレジット",
  "位置情報",
  "検索ログ",
  "婚姻歴",
  "家族構成",
  "職歴",
  "病歴",
  "診療記録",
  "障害",
  "犯罪歴",
  "前科",
  "思想",
  "信条",
  "人種",
  "健診結果",
  "性生活",
];

const clips = [
  "remotion/clips/diet-exterior-day-vert.mp4",
  "remotion/clips/politician-speech-vert.mp4",
  "remotion/clips/flag-waving-vert.mp4",
  "remotion/clips/justice-gavel-vert.mp4",
];

const slides = [
  {
    text: "条件は",
    sub: "AI・統計目的",
    narr: "条件は、AI・統計目的。",
    durationInFrames: 48,
    bgVideoSrc: clips[0],
  },
  ...tags.map((tag, i) => ({
    text: tag,
    narr: tag,
    durationInFrames: 24,
    bgVideoSrc: clips[i % clips.length],
  })),
];

const props = {
  hook: "同意なしで渡せる情報",
  hookTelop: ["同意なしで渡せる情報", "全部、読み上げます"],
  hookNarr: "同意なしで渡せる情報。全部、読み上げます。",
  hookDurationInFrames: 54,
  hookBgVideoSrc: clips[0],
  slides,
  hasGraph: false,
  question: "この法案をまとめた記事は",
  endHint: "コメント欄のリンクから",
  endNarr: "この法案をまとめた記事は、コメント欄のリンクから。",
  endDurationInFrames: 75,
  endBgVideoSrc: clips[0],
  bgVideoSrc: "remotion/bg-diet.mp4",
  logoSrc: "assets/logo-header-nihon-seiji-naw.png",
};

const out = path.join(root, "remotion/props/short-data-kojin-joho-v2.json");
await writeFile(out, `${JSON.stringify(props, null, 2)}\n`, "utf8");
console.log(`OK ${out} (${slides.length} slides)`);
