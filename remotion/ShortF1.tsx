import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BeatSlide, type BeatData } from "./components/BeatSlide";
import { BEAT_GAP_FRAMES } from "./theme";

export type BeatRender = BeatData & {
  durationInFrames: number;
  audioSrc: string;
  bgImage?: string;
  bgVideoSrc?: string;
};

export type ShortF1Props = {
  slug: string;
  category: string;
  logoSrc?: string;
  bgVideoSrc?: string;
  beats: BeatRender[];
};

export const ShortF1: React.FC<ShortF1Props> = ({
  category,
  logoSrc,
  bgVideoSrc,
  beats,
}) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05080f" }}>
      {beats.map((beat, index) => {
        const from = cursor;
        const bgStartFrame = from;
        cursor += beat.durationInFrames + BEAT_GAP_FRAMES;
        return (
          <Sequence
            key={beat.id}
            from={from}
            durationInFrames={beat.durationInFrames}
            name={beat.id}
          >
            <BeatSlide
              beat={beat}
              beatIndex={index}
              beatTotal={beats.length}
              category={category}
              logoSrc={logoSrc}
              bgVideoSrc={beat.bgVideoSrc ?? bgVideoSrc}
              bgStartFrame={beat.bgVideoSrc ? 0 : bgStartFrame}
            />
            <Audio src={staticFile(beat.audioSrc)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
