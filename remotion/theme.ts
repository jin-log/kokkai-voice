import { loadFont } from "@remotion/google-fonts/NotoSansJP";

const { fontFamily: notoSans } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

export const THEME = {
  colors: {
    bg0: "#05080f",
    bg1: "#0c1528",
    blue: "#2563eb",
    text: "#ffffff",
    muted: "#94a3b8",
    panel: "rgba(6,12,24,0.9)",
    border: "rgba(59,130,246,0.35)",
  },
  font: notoSans,
  fontDisplay: notoSans,
} as const;

export type BeatStyle = "hook" | "question" | "number" | "body" | "diet" | "cta";

export type StyleConfig = {
  accent: string;
  label: string;
  size: number;
  /** 行ごとの文字色 */
  lineColors: string[];
  /** 2行目のサイズ比率 */
  subScale: number;
  /** 背景ティント */
  bgTint: string;
  /** グロー色 */
  glow: string;
};

export const STYLE_MAP: Record<BeatStyle, StyleConfig> = {
  hook: {
    accent: "#f43f5e",
    label: "いまの論点",
    size: 108,
    lineColors: ["#ffffff", "#fecaca"],
    subScale: 0.9,
    bgTint: "rgba(244,63,94,0.22)",
    glow: "rgba(244,63,94,0.45)",
  },
  question: {
    accent: "#f59e0b",
    label: "疑問",
    size: 96,
    lineColors: ["#ffffff", "#fde68a"],
    subScale: 0.88,
    bgTint: "rgba(245,158,11,0.18)",
    glow: "rgba(245,158,11,0.35)",
  },
  number: {
    accent: "#38bdf8",
    label: "数字",
    size: 102,
    lineColors: ["#7dd3fc", "#ffffff"],
    subScale: 0.92,
    bgTint: "rgba(56,189,248,0.2)",
    glow: "rgba(56,189,248,0.4)",
  },
  body: {
    accent: "#a5b4fc",
    label: "要点",
    size: 92,
    lineColors: ["#e0e7ff", "#cbd5e1"],
    subScale: 0.9,
    bgTint: "rgba(99,102,241,0.15)",
    glow: "rgba(165,180,252,0.3)",
  },
  diet: {
    accent: "#38bdf8",
    label: "国会",
    size: 88,
    lineColors: ["#ffffff", "#bae6fd"],
    subScale: 0.9,
    bgTint: "rgba(56,189,248,0.18)",
    glow: "rgba(56,189,248,0.35)",
  },
  cta: {
    accent: "#60a5fa",
    label: "続きは",
    size: 90,
    lineColors: ["#bfdbfe", "#ffffff"],
    subScale: 1,
    bgTint: "rgba(37,99,235,0.25)",
    glow: "rgba(96,165,250,0.45)",
  },
};

export const FPS = 30;
export const BEAT_GAP_FRAMES = 4;

/** ビートID → 背景OGP種別 */
export const BEAT_BG_KEY: Record<string, string> = {
  hook: "hook",
  gap: "number",
  kokkai: "quote",
  why: "quote",
  cta: "hook",
};
