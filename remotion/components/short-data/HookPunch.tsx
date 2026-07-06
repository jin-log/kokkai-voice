import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontSizeForLine } from "../../lib/telop";
import { STYLE_MAP, THEME } from "../../theme";

const NUMBER_COLOR = "#38bdf8";
const PUNCH_COLOR = "#fecaca";
const MAX_TELOP_CHARS = 14;

function splitHookTelop(hook: string): string[] {
  const text = (hook || "").replace(/\s+/g, " ").trim();
  if (!text) return [""];

  const oni = text.match(/^(.+?のに)(.+)$/);
  if (oni) {
    const a = oni[1].trim().slice(0, MAX_TELOP_CHARS);
    const b = oni[2].trim().slice(0, MAX_TELOP_CHARS);
    if (a && b) return [a, b];
  }

  const q = text.indexOf("？");
  if (q > 0) {
    const a = text.slice(0, q + 1).trim();
    if (a.length <= MAX_TELOP_CHARS) return [a];
  }

  if (text.length <= MAX_TELOP_CHARS) return [text];
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid).trim(), text.slice(mid).trim()].filter(Boolean);
}

function splitNumberSpans(text: string): { text: string; isNumber: boolean }[] {
  return text
    .split(/(\d+(?:\.\d+)?(?:兆|億|万|%|円|人|件|年|カ月|ヶ月)?)/g)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      isNumber: /^\d/.test(part),
    }));
}

type Props = {
  hook: string;
  hookTelop?: string[];
};

/** 冒頭フック — 2段パンチ＋フラッシュ＋数字強調 */
export const HookPunch: React.FC<Props> = ({ hook, hookTelop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cfg = STYLE_MAP.hook;

  const lines =
    hookTelop && hookTelop.length >= 1
      ? hookTelop.filter(Boolean).slice(0, 2)
      : splitHookTelop(hook);

  const line1 = lines[0] ?? hook;
  const line2 = lines[1];

  const flash = interpolate(frame, [0, 4, 10], [0.85, 0.35, 0], {
    extrapolateRight: "clamp",
  });

  const slam1 = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 320, mass: 0.55 },
  });
  const scale1 = interpolate(slam1, [0, 1], [1.45, 1]);
  const y1 = interpolate(slam1, [0, 1], [56, 0]);

  const slam2 = spring({
    frame: frame - 14,
    fps,
    config: { damping: 10, stiffness: 280, mass: 0.6 },
  });
  const scale2 = interpolate(slam2, [0, 1], [1.3, 1]);
  const y2 = interpolate(slam2, [0, 1], [40, 0]);

  const panelPulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.92, 1]);

  return (
    <AbsoluteFill style={{ zIndex: 6 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 42%, ${cfg.glow} 0%, transparent 55%)`,
          opacity: interpolate(slam1, [0, 1], [0.9, 0.35]),
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#ffffff",
          opacity: flash,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 28px",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.58)",
            borderRadius: 24,
            padding: "40px 28px 34px",
            border: `2px solid ${cfg.accent}`,
            boxShadow: `0 0 48px ${cfg.glow}, 0 24px 64px rgba(0,0,0,0.65)`,
            maxWidth: "100%",
            width: "100%",
            transform: `scale(${panelPulse})`,
          }}
        >
          <div
            style={{
              opacity: slam1,
              transform: `translateY(${y1}px) scale(${scale1})`,
              fontSize: fontSizeForLine(line1, 144),
              fontWeight: 900,
              fontFamily: THEME.font,
              textAlign: "center",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              textShadow: `0 4px 28px rgba(0,0,0,0.7), 0 0 20px ${cfg.glow}`,
            }}
          >
            {splitNumberSpans(line1).map((p, i) => (
              <span
                key={i}
                style={{ color: p.isNumber ? NUMBER_COLOR : "#ffffff" }}
              >
                {p.text}
              </span>
            ))}
          </div>

          {line2 ? (
            <div
              style={{
                marginTop: 18,
                opacity: slam2,
                transform: `translateY(${y2}px) scale(${scale2})`,
                fontSize: fontSizeForLine(line2, 132),
                fontWeight: 900,
                fontFamily: THEME.font,
                textAlign: "center",
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: line2.includes("？") ? PUNCH_COLOR : "#ffffff",
                textShadow: `0 4px 24px rgba(0,0,0,0.65), 0 0 16px ${cfg.glow}`,
              }}
            >
              {splitNumberSpans(line2).map((p, i) => (
                <span
                  key={i}
                  style={{
                    color: p.isNumber
                      ? NUMBER_COLOR
                      : line2.includes("？")
                        ? PUNCH_COLOR
                        : "#ffffff",
                  }}
                >
                  {p.text}
                </span>
              ))}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 20,
              marginLeft: "auto",
              marginRight: "auto",
              width: 140,
              height: 6,
              borderRadius: 4,
              background: `linear-gradient(90deg, ${cfg.accent}, ${NUMBER_COLOR}, transparent)`,
              opacity: slam2,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
