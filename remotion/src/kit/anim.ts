import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 linear ramp between frames `from` and `from + dur`. */
export const ramp = (frame: number, from: number, dur = 15) =>
  interpolate(frame, [from, from + dur], [0, 1], clamp);

/** 0→1 spring starting at frame `from`. */
export const useSpringAt = (from: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping } });
};

/** Seconds → frames at 30fps. */
export const sec = (t: number) => Math.round(t * 30);

export const clampOpts = clamp;

/** Smooth 0→1 (ease in-out) between frames. */
export const ease = (frame: number, from: number, dur = 12) => {
  const t = ramp(frame, from, dur);
  return t * t * (3 - 2 * t);
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * State timeline used by every DSA component: each step is a PARTIAL state applied at frame `at`;
 * later steps inherit everything earlier steps set. Returns the state before and after the current
 * step plus an eased transition progress `t` (0→1 over `dur` frames), so components can animate deltas.
 */
export function useTimeline<S extends object>(base: S, steps: (Partial<S> & { at: number })[] = [], dur = 12) {
  const frame = useCurrentFrame();
  const sorted = [...steps].sort((a, b) => a.at - b.at);
  let prev: S = base;
  let cur: S = base;
  let at = -1;
  let index = -1;
  sorted.forEach((s, i) => {
    if (frame >= s.at) {
      prev = cur;
      const { at: _at, ...rest } = s as { at: number } & Partial<S>;
      cur = { ...cur, ...rest } as S;
      at = s.at;
      index = i;
    }
  });
  const t = at < 0 ? 1 : ease(frame, at, dur);
  return { prev, cur, t, at, index, frame };
}
