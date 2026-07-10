import React from "react";
import { Composition } from "remotion";
import { ShortDataV1, type ShortDataV1Props } from "./ShortDataV1";
import { ShortF1, type ShortF1Props } from "./ShortF1";
import { shortDataDurationInFrames } from "./lib/short-data-timing";
import { BEAT_GAP_FRAMES, FPS } from "./theme";
import renderProps from "./props/short-data-render.json";

const shortDataDefaultProps: ShortDataV1Props = renderProps as unknown as ShortDataV1Props;

const defaultProps: ShortF1Props = {
  slug: "shoshika",
  category: "少子化",
  beats: [
    {
      id: "hook",
      style: "hook",
      telop: ["8割は結婚したい", "なのに少子化は止まらない"],
      durationInFrames: 90,
      audioSrc: "",
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortF1"
        component={ShortF1}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          const beats = props.beats ?? [];
          const durationInFrames = beats.reduce(
            (sum, b, i) =>
              sum + b.durationInFrames + (i < beats.length - 1 ? BEAT_GAP_FRAMES : 0),
            0,
          );
          return {
            durationInFrames: Math.max(durationInFrames, FPS),
            fps: FPS,
            width: 1080,
            height: 1920,
          };
        }}
      />
      <Composition
        id="ShortDataV1"
        component={ShortDataV1}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={shortDataDefaultProps}
        calculateMetadata={({ props }) => {
          const durationInFrames = shortDataDurationInFrames(props);
          return {
            durationInFrames: Math.max(durationInFrames, FPS),
            fps: FPS,
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
