import type { ShortDataV1Props } from "../types/short-data";

export const HOOK_FRAMES = 90;
export const SLIDE_FRAMES = 105;
export const END_FRAMES = 90;
export const SECTION_GAP_FRAMES = 0;

export const MIN_HOOK_FRAMES = 60;
export const MIN_SLIDE_FRAMES = 72;
export const MIN_END_FRAMES = 72;

export function sectionFrames(
  durationInFrames: number | undefined,
  fallback: number,
  min: number,
): number {
  if (durationInFrames && durationInFrames > 0) {
    return Math.max(durationInFrames, min);
  }
  return fallback;
}

export function shortDataDurationInFrames(props: ShortDataV1Props): number {
  const hook = sectionFrames(props.hookDurationInFrames, HOOK_FRAMES, MIN_HOOK_FRAMES);
  const slideSum = (props.slides ?? []).reduce(
    (sum, s) => sum + sectionFrames(s.durationInFrames, SLIDE_FRAMES, MIN_SLIDE_FRAMES),
    0,
  );
  const end = sectionFrames(props.endDurationInFrames, END_FRAMES, MIN_END_FRAMES);
  const sections = 1 + (props.slides?.length ?? 0) + 1;
  const gaps = Math.max(0, sections - 1) * SECTION_GAP_FRAMES;
  return hook + slideSum + end + gaps;
}
