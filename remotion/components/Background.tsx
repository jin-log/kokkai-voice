import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { STYLE_MAP, THEME, type BeatStyle } from "../theme";

type Props = {
  bgVideoSrc?: string;
  bgStartFrame?: number;
  beatStyle: BeatStyle;
};

export const Background: React.FC<Props> = ({ bgVideoSrc, bgStartFrame = 0, beatStyle }) => {
  const frame = useCurrentFrame();
  const cfg = STYLE_MAP[beatStyle];
  const sweepX = interpolate(frame % 180, [0, 180], [-120, 1200]);
  const pulse = interpolate(Math.sin(frame / 45), [-1, 1], [0.35, 0.55]);

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.bg0 }}>
      {bgVideoSrc ? (
        <OffthreadVideo
          src={staticFile(bgVideoSrc)}
          startFrom={bgStartFrame}
          muted
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(165deg, ${THEME.colors.bg0} 0%, ${THEME.colors.bg1} 55%, #0a1628 100%)`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: cfg.bgTint,
          opacity: bgVideoSrc ? 0.72 : 1,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${cfg.glow} 0%, transparent 70%)`,
          opacity: pulse,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: sweepX,
          width: 220,
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
          transform: "skewX(-12deg)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,8,15,0.55) 0%, transparent 28%, transparent 68%, rgba(5,8,15,0.82) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 6,
          background: `linear-gradient(90deg, ${cfg.accent}, ${THEME.colors.blue}, ${cfg.accent})`,
        }}
      />
    </AbsoluteFill>
  );
};
