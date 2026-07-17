import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CenterTelop } from "./components/short-data/CenterTelop";
import { EndSlide } from "./components/short-data/EndSlide";
import { HookPunch } from "./components/short-data/HookPunch";
import { ParliamentBackground } from "./components/short-data/ParliamentBackground";
import { ProgressRail } from "./components/short-data/ProgressRail";
import {
  END_FRAMES,
  HOOK_FRAMES,
  MIN_END_FRAMES,
  MIN_HOOK_FRAMES,
  MIN_SLIDE_FRAMES,
  SECTION_GAP_FRAMES,
  SLIDE_FRAMES,
  sectionFrames,
} from "./lib/short-data-timing";
import type { ShortDataV1Props } from "./types/short-data";

export type { ShortDataV1Props } from "./types/short-data";

export const ShortDataV1: React.FC<ShortDataV1Props> = ({
  hook,
  hookTelop,
  hookAudioSrc,
  hookDurationInFrames,
  hookBgVideoSrc,
  slides,
  hasGraph = false,
  graphData = [],
  graphType = "line",
  question,
  endHint,
  endAudioSrc,
  endDurationInFrames,
  bgVideoSrc,
  logoSrc,
}) => {
  const stepTotal = 1 + slides.length + 1;
  let cursor = 0;

  const hookDur = sectionFrames(hookDurationInFrames, HOOK_FRAMES, MIN_HOOK_FRAMES);
  const hookFrom = cursor;
  cursor += hookDur + SECTION_GAP_FRAMES;

  const slideStarts = slides.map((slide, index) => {
    const from = cursor;
    const dur = sectionFrames(slide.durationInFrames, SLIDE_FRAMES, MIN_SLIDE_FRAMES);
    cursor += dur + SECTION_GAP_FRAMES;
    const isLast = index === slides.length - 1;
    return { slide, from, dur, isLast };
  });

  const endDur = sectionFrames(endDurationInFrames, END_FRAMES, MIN_END_FRAMES);
  const endFrom = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: "#030712" }}>
      <Sequence from={hookFrom} durationInFrames={hookDur} name="hook">
        <AbsoluteFill>
          <ParliamentBackground bgVideoSrc={hookBgVideoSrc ?? bgVideoSrc} hookZoom />
          <HookPunch hook={hook} hookTelop={hookTelop} />
          <ProgressRail stepIndex={0} stepTotal={stepTotal} />
          {hookAudioSrc ? <Audio src={staticFile(hookAudioSrc)} /> : null}
        </AbsoluteFill>
      </Sequence>

      {slideStarts.map(({ slide, from, dur, isLast }, index) => (
        <Sequence
          key={`slide-${index}`}
          from={from}
          durationInFrames={dur}
          name={`slide-${index + 1}`}
        >
          <AbsoluteFill>
            <ParliamentBackground
              bgVideoSrc={slide.bgVideoSrc ?? bgVideoSrc}
              bgStartFrame={from}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isLast && hasGraph ? "80px 32px 120px" : "100px 40px",
                zIndex: 5,
              }}
            >
              <CenterTelop
                slide={slide}
                showGraph={isLast && hasGraph}
                graphData={graphData}
                graphType={graphType}
              />
            </div>
            <ProgressRail stepIndex={index + 1} stepTotal={stepTotal} />
            {slide.audioSrc ? <Audio src={staticFile(slide.audioSrc)} /> : null}
          </AbsoluteFill>
        </Sequence>
      ))}

      <Sequence from={endFrom} durationInFrames={endDur} name="end">
        <EndSlide question={question} endHint={endHint} logoSrc={logoSrc} />
        <ProgressRail stepIndex={stepTotal - 1} stepTotal={stepTotal} />
        {endAudioSrc ? <Audio src={staticFile(endAudioSrc)} /> : null}
      </Sequence>
    </AbsoluteFill>
  );
};
