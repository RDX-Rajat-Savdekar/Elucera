import React from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { STATES, theme, type State } from "../../theme";
import { ease } from "../anim";

export type Val = number | string;
export type Marks<K extends string | number = number> = Partial<Record<K, State>>;

/**
 * Replays `steps` (sorted by `at`) through `reduce` up to the current frame. Returns the state before and
 * after the latest step, the step itself, and an eased transition progress `t` (0→1 over `dur` frames).
 */
export function useSteps<S, St extends { at: number }>(base: S, steps: St[] | undefined, reduce: (s: S, step: St) => S, dur = 12) {
  const frame = useCurrentFrame();
  const sorted = [...(steps ?? [])].sort((a, b) => a.at - b.at);
  let prev = base;
  let cur = base;
  let step: St | null = null;
  for (const s of sorted) {
    if (frame < s.at) break;
    prev = cur;
    cur = reduce(cur, s);
    step = s;
  }
  const t = step ? ease(frame, step.at, dur) : 1;
  return { prev, cur, step, t, frame };
}

/** Merge a record where `null` deletes a key (used for pointers, links, badges, variables). */
export function mergeNullable<K extends string | number, V>(base: Partial<Record<K, V>>, patch?: Partial<Record<K, V | null>>) {
  if (!patch) return base;
  const out: Partial<Record<K, V>> = { ...base };
  for (const k of Object.keys(patch) as K[]) {
    const v = patch[k];
    if (v === null || v === undefined) delete out[k];
    else out[k] = v as V;
  }
  return out;
}

/** Colours for an element moving from state `a` to `b` with progress t. */
export function stateColors(a: State | undefined, b: State | undefined, t: number) {
  const A = STATES[a ?? "default"], B = STATES[b ?? "default"];
  return {
    fill: interpolateColors(t, [0, 1], [A.fill, B.fill]),
    stroke: interpolateColors(t, [0, 1], [A.stroke, B.stroke]),
    text: interpolateColors(t, [0, 1], [A.text, B.text]),
  };
}

export const POINTER_COLORS = [theme.accent3, theme.accent2, theme.accent, theme.good, "#B392F0", "#FF9F6B"];

/** Stable colour per pointer name, in first-seen order across the whole timeline. */
export function pointerPalette(names: string[]) {
  const map: Record<string, string> = {};
  names.forEach((n, i) => (map[n] = POINTER_COLORS[i % POINTER_COLORS.length]));
  return map;
}

/** A labelled pointer arrow (▲ + name) used under arrays / lists. Absolutely positioned at (x, y) = tip. */
export const PointerMark: React.FC<{ x: number; y: number; name: string; color: string; opacity?: number; size?: number; up?: boolean }> = ({
  x,
  y,
  name,
  color,
  opacity = 1,
  size = 40,
  up = true,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, ${up ? "0" : "-100%"})`,
      display: "flex",
      flexDirection: up ? "column" : "column-reverse",
      alignItems: "center",
      opacity,
      pointerEvents: "none",
    }}
  >
    <div style={{ width: 0, height: 0, borderLeft: `${size * 0.42}px solid transparent`, borderRight: `${size * 0.42}px solid transparent`, [up ? "borderBottom" : "borderTop"]: `${size * 0.6}px solid ${color}` } as React.CSSProperties} />
    <div style={{ fontFamily: theme.mono, fontWeight: 900, fontSize: size * 0.85, color, lineHeight: 1.1, marginTop: up ? 4 : 0, marginBottom: up ? 0 : 4 }}>{name}</div>
  </div>
);

/** Caption line under a structure ("sum = 9", "found!"). Cross-fades when the text changes. */
export const Note: React.FC<{ prev?: string; cur?: string; t: number; top: number; width: number; color?: string; size?: number }> = ({ prev, cur, t, top, width, color = theme.fg, size = 42 }) => {
  const style = (o: number): React.CSSProperties => ({
    position: "absolute",
    top,
    left: 0,
    width,
    textAlign: "center",
    fontFamily: theme.font,
    fontWeight: 800,
    fontSize: size,
    color,
    opacity: o,
  });
  if (prev === cur) return cur ? <div style={style(1)}>{cur}</div> : null;
  return (
    <>
      {prev && <div style={style(1 - t)}>{prev}</div>}
      {cur && <div style={style(t)}>{cur}</div>}
    </>
  );
};

/** Small heading above a structure ("nums", "queue", "dp"). */
export const StructLabel: React.FC<{ text?: string; left?: number; top?: number }> = ({ text, left = 0, top = -64 }) =>
  text ? (
    <div style={{ position: "absolute", left, top, fontFamily: theme.mono, fontWeight: 800, fontSize: 38, color: theme.muted }}>{text}</div>
  ) : null;

export const fmt = (v: Val | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** Font size that fits `text` in a box of width `w`. */
export const fitSize = (text: string, w: number, max: number) => Math.min(max, Math.floor((w * 1.7) / Math.max(1, text.length)));
