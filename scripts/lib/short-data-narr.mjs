/**
 * ShortDataV1 用ナレーション文の組み立て
 * @param {import('../../remotion/types/short-data.ts').ShortDataV1Props} props
 */
export function narrForHook(props) {
  if (props.hookNarr) return props.hookNarr;
  return (props.hook || "").replace(/\s+/g, " ").trim();
}

/**
 * @param {import('../../remotion/types/short-data.ts').ShortDataSlide} slide
 */
export function narrForSlide(slide) {
  if (slide.narr) return slide.narr;

  const parts = [];
  const text = (slide.text || "").replace(/^\d{4}年\s*/, "").trim();
  if (slide.year && !slide.text?.startsWith(slide.year)) {
    parts.push(`${slide.year}年`);
  }
  if (text) parts.push(text);
  if (slide.number) parts.push(slide.number);
  if (slide.sub) parts.push(slide.sub);

  return parts.join("。").replace(/。+/g, "。");
}

/**
 * エンドの読み上げ — 質問のみ（ロゴ・概要欄テキストは読まない）
 * @param {import('../../remotion/types/short-data.ts').ShortDataV1Props} props
 */
export function narrForEnd(props) {
  if (props.endNarr) return props.endNarr;
  const q = props.question || "あなたはどう思いますか？";
  return q.endsWith("？") ? q : `${q}？`;
}

/** ロゴ表示用の無音ホールド（フレーム） */
export const END_LOGO_HOLD_FRAMES = 20;

/** TTS 尺 + テロップ余白（発話後の間を最小化） */
export const NARR_PAD_FRAMES = 2;
