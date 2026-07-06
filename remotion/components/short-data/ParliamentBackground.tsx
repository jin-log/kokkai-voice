import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { THEME } from "../../theme";

type Props = {
  bgVideoSrc?: string;
  bgStartFrame?: number;
  /** フック用 — 開始ズームイン */
  hookZoom?: boolean;
};

/** 国会・議場系の暗め背景（動画 or グラデーション） */
export const ParliamentBackground: React.FC<Props> = ({
  bgVideoSrc,
  bgStartFrame = 0,
  hookZoom = false,
}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 50), [-1, 1], [0.3, 0.5]);
  const zoom = hookZoom
    ? interpolate(frame, [0, 45], [1.12, 1.02], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.bg0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
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
            background: `linear-gradient(165deg, #030712 0%, ${THEME.colors.bg1} 45%, #0f172a 100%)`,
          }}
        />
      )}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(3,7,18,0.62)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 90% 55% at 50% 15%, rgba(56,189,248,0.18) 0%, transparent 70%)",
          opacity: pulse,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,7,18,0.5) 0%, transparent 30%, transparent 65%, rgba(3,7,18,0.88) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 5,
          background: `linear-gradient(90deg, ${THEME.colors.blue}, #38bdf8, ${THEME.colors.blue})`,
        }}
      />
    </AbsoluteFill>
  );
};
