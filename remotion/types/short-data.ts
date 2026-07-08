/** ショート動画テンプレ ShortDataV1 — props 型 */

export type ShortDataGraphPoint = {
  year: number;
  value: number;
};

export type ShortDataSlide = {
  text: string;
  number?: string;
  year?: string;
  sub?: string;
  /** ナレーション文（未指定時は生成スクリプトが自動組み立て） */
  narr?: string;
  /** public/ からの相対パス */
  audioSrc?: string;
  /** スライド単位の背景動画 */
  bgVideoSrc?: string;
  /** TTS 尺に合わせたフレーム数 */
  durationInFrames?: number;
};

export type ShortDataV1Props = {
  hook: string;
  /** フックテロップ（1〜3行。1行目に案件名を入れる） */
  hookTelop?: string[];
  hookNarr?: string;
  hookAudioSrc?: string;
  hookDurationInFrames?: number;
  hookBgVideoSrc?: string;
  slides: ShortDataSlide[];
  hasGraph?: boolean;
  graphData?: ShortDataGraphPoint[];
  /** 折れ線 or 棒 — 未指定時は折れ線 */
  graphType?: "line" | "bar";
  question?: string;
  /** 未指定時は question のみ読み上げ（ロゴ・概要欄は読まない） */
  endNarr?: string;
  endAudioSrc?: string;
  endDurationInFrames?: number;
  endBgVideoSrc?: string;
  /** public/ からの相対パス（例: remotion/bg-diet.mp4） */
  bgVideoSrc?: string;
  logoSrc?: string;
};
