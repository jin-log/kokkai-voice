import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontSizeForLine } from "../../lib/telop";
import { THEME } from "../../theme";
import type { ShortDataSlide } from "../../types/short-data";
import { AnimatedBarGraph } from "./AnimatedBarGraph";
import { AnimatedLineGraph } from "./AnimatedLineGraph";
import type { ShortDataGraphPoint } from "../../types/short-data";

const NUMBER_COLOR = "#38bdf8";
const NUMBER_GLOW = "0 0 24px rgba(56,189,248,0.45)";

type Props = {
  slide: ShortDataSlide;
  showGraph?: boolean;
  graphData?: ShortDataGraphPoint[];
  graphType?: "line" | "bar";
};

export const CenterTelop: React.FC<Props> = ({
  slide,
  showGraph,
  graphData,
  graphType = "line",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 130, mass: 0.75 },
  });
  const y = interpolate(enter, [0, 1], [32, 0]);
  const hasGraph = Boolean(showGraph && graphData && graphData.length >= 2);
  const isBigBudget = /3\.6兆円/.test(slide.number ?? "");
  const isKodomoMirai = /こども未来戦略/.test(slide.text);
  const isHeroSlide = isBigBudget || isKodomoMirai;
  const numberSize = fontSizeForLine(
    slide.number ?? "0",
    hasGraph ? 110 : isBigBudget ? 158 : 140,
  );
  const textSize = fontSizeForLine(
    slide.text,
    hasGraph ? 68 : isHeroSlide ? 104 : 90,
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        opacity: enter,
        transform: `translateY(${y}px)`,
        gap: hasGraph ? 20 : 16,
      }}
    >
      <div style={{ textAlign: "center", width: "100%" }}>
        {slide.year ? (
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#94a3b8",
              fontFamily: THEME.font,
              marginBottom: 12,
              letterSpacing: "0.08em",
            }}
          >
            {slide.year}
          </div>
        ) : null}
        <div
          style={{
            fontSize: textSize,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: THEME.font,
            lineHeight: 1.18,
            textShadow: "0 3px 18px rgba(0,0,0,0.56)",
            letterSpacing: "-0.02em",
          }}
        >
          {slide.text}
        </div>
        {slide.number ? (
          <div
            style={{
              marginTop: 16,
              fontSize: numberSize,
              fontWeight: 900,
              color: NUMBER_COLOR,
              fontFamily: THEME.font,
              lineHeight: 1.02,
              textShadow: NUMBER_GLOW,
              letterSpacing: "-0.03em",
            }}
          >
            {slide.number}
          </div>
        ) : null}
        {slide.sub ? (
          <div
            style={{
              marginTop: 14,
              fontSize: hasGraph ? 44 : 52,
              fontWeight: 800,
              color: "#cbd5e1",
              fontFamily: THEME.font,
              lineHeight: 1.22,
            }}
          >
            {slide.sub}
          </div>
        ) : null}
      </div>

      {hasGraph ? (
        <div
          style={{
            marginTop: 8,
            padding: "16px 20px",
            background: "rgba(0,0,0,0.45)",
            borderRadius: 16,
            border: "1px solid rgba(56,189,248,0.25)",
          }}
        >
          {graphType === "bar" ? (
            <AnimatedBarGraph data={graphData!} />
          ) : (
            <AnimatedLineGraph data={graphData!} />
          )}
        </div>
      ) : null}
    </div>
  );
};
