import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { STYLE_MAP, type BeatStyle } from "../theme";
import { Background } from "./Background";
import { Chrome } from "./Chrome";
import { CtaSlide } from "./CtaSlide";
import { TelopStack } from "./TelopStack";

export type BeatData = {
  id: string;
  style: BeatStyle;
  telop: string[];
  bgImage?: string;
};

type Props = {
  beat: BeatData;
  beatIndex: number;
  beatTotal: number;
  category: string;
  logoSrc?: string;
  bgVideoSrc?: string;
  bgStartFrame?: number;
};

export const BeatSlide: React.FC<Props> = ({
  beat,
  beatIndex,
  beatTotal,
  category,
  logoSrc,
  bgVideoSrc,
  bgStartFrame,
}) => {
  if (beat.style === "cta") {
    return <CtaSlide logoSrc={logoSrc} />;
  }

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 130, mass: 0.75 },
  });
  const cfg = STYLE_MAP[beat.style];
  const y = interpolate(enter, [0, 1], [36, 0]);
  const opacity = enter;

  return (
    <AbsoluteFill>
      <Background
        bgVideoSrc={bgVideoSrc}
        bgStartFrame={bgStartFrame}
        beatStyle={beat.style}
      />
      <Chrome
        category={category}
        beatIndex={beatIndex}
        beatTotal={beatTotal}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 40px 100px",
          opacity,
          transform: `translateY(${y}px)`,
          zIndex: 5,
        }}
      >
        <TelopStack lines={beat.telop} cfg={cfg} />
      </div>
    </AbsoluteFill>
  );
};
