import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { THEME } from "../theme";

type Props = {
  logoSrc?: string;
};

export const CtaSlide: React.FC<Props> = ({ logoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const y = interpolate(enter, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 56px",
          opacity: enter,
          transform: `translateY(${y}px)`,
        }}
      >
        {logoSrc ? (
          <Img
            src={staticFile(logoSrc)}
            style={{
              width: 920,
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              marginBottom: 72,
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#0f172a",
              fontFamily: THEME.font,
              marginBottom: 72,
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            日本の政治now.
          </div>
        )}

        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#1e293b",
            fontFamily: THEME.font,
            letterSpacing: "0.06em",
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          リンクは概要欄
        </div>
      </div>
    </AbsoluteFill>
  );
};
