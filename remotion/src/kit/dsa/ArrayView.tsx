import React from "react";
import { theme, type State } from "../../theme";
import { mix } from "../anim";
import { type Marks, Note, PointerMark, StructLabel, type Val, fitSize, fmt, mergeNullable, pointerPalette, stateColors, useSteps } from "./common";

export type ArrayStep = {
  at: number;
  /** replace all values */
  values?: Val[];
  /** set individual cells: { 3: 10 } */
  set?: Partial<Record<number, Val>>;
  /** swap two cells (animated arc) */
  swap?: [number, number];
  /** per-cell states; REPLACES the previous marks. Use {} to clear. */
  mark?: Marks;
  /** named pointers; MERGES (null removes): { i: 0, j: 4 } */
  pointers?: Partial<Record<string, number | null>>;
  /** sliding window / range bracket [l, r] inclusive; null hides */
  window?: [number, number] | null;
  /** caption under the array */
  note?: string;
};

type S = { values: Val[]; mark: Marks; pointers: Partial<Record<string, number>>; window: [number, number] | null; note: string; swap: [number, number] | null };

/**
 * Array / string as a row of cells with indices, pointers below, an optional window bracket and a note line.
 * Centred in its own box (width ≤ 960): put it in a <Slot area="main">. Works for numbers or single characters.
 */
export const ArrayView: React.FC<{ values: Val[]; steps?: ArrayStep[]; label?: string; showIndex?: boolean; cell?: number; at?: number }> = ({
  values,
  steps,
  label,
  showIndex = true,
  cell = 120,
}) => {
  const base: S = { values, mark: {}, pointers: {}, window: null, note: "", swap: null };
  const { prev, cur, step, t } = useSteps<S, ArrayStep>(base, steps, (s, st) => {
    let v = st.values ? [...st.values] : [...s.values];
    if (st.set) for (const [k, val] of Object.entries(st.set)) v[+k] = val as Val;
    if (st.swap) {
      const [a, b] = st.swap;
      [v[a], v[b]] = [v[b], v[a]];
    }
    return {
      values: v,
      mark: st.mark ?? s.mark,
      pointers: mergeNullable(s.pointers, st.pointers),
      window: st.window === undefined ? s.window : st.window,
      note: st.note ?? s.note,
      swap: st.swap ?? null,
    };
  });
  const n = cur.values.length;
  const gap = 14;
  const c = Math.min(cell, Math.floor((960 - gap * (n - 1)) / Math.max(1, n)));
  const width = n * c + (n - 1) * gap;
  const x = (i: number) => i * (c + gap);
  const allNames = Array.from(new Set((steps ?? []).flatMap((s) => Object.keys(s.pointers ?? {}))));
  const colors = pointerPalette(allNames);
  const fs = Math.max(...cur.values.map((v) => fitSize(fmt(v), c, c * 0.48)));
  const swapping = step?.swap && t < 1 ? step.swap : null;

  // pointers: a pointer drops to a lower row when its label would touch another pointer's label
  const pSize = Math.min(44, c * 0.4);
  const labelW = (nm: string) => Math.max(pSize * 0.84, nm.length * pSize * 0.85 * 0.62);
  const rowOf: Record<string, number> = {};
  const placed: { x: number; w: number; row: number }[] = [];
  for (const name of allNames) {
    const at = cur.pointers[name];
    if (at === undefined) continue;
    const px = x(at) + c / 2, w = labelW(name);
    let row = 0;
    while (placed.some((p) => p.row === row && Math.abs(p.x - px) < (p.w + w) / 2 + 8)) row++;
    rowOf[name] = row;
    placed.push({ x: px, w, row });
  }
  const pointerTop = c + (showIndex ? 58 : 18);
  const maxStack = Math.max(1, ...placed.map((p) => p.row + 1));
  const height = pointerTop + maxStack * 86 + 70;

  const win = cur.window;
  const pw = prev.window ?? cur.window;
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height }}>
      <StructLabel text={label} />
      {win && (
        <div
          style={{
            position: "absolute",
            top: -14,
            height: c + 28,
            left: mix(x(pw![0]), x(win[0]), t) - 12,
            width: mix(x(pw![1]) - x(pw![0]), x(win[1]) - x(win[0]), t) + c + 24,
            borderRadius: 22,
            border: `5px solid ${theme.accent}`,
            background: `${theme.accent}1A`,
          }}
        />
      )}
      {cur.values.map((v, i) => {
        let left = x(i);
        let lift = 0;
        if (swapping && (i === swapping[0] || i === swapping[1])) {
          const from = i === swapping[0] ? swapping[1] : swapping[0];
          left = mix(x(from), x(i), t);
          lift = Math.sin(Math.PI * t) * c * 0.9 * (i === swapping[0] ? -1 : 1);
        }
        const col = stateColors(prev.mark[i], cur.mark[i], t);
        const changed = !swapping && prev.values[i] !== v && step && t < 1;
        const k = changed ? 1 + 0.15 * Math.sin(Math.PI * t) : 1;
        return (
          <div key={i} style={{ position: "absolute", left, top: lift, width: c, height: c, transform: `scale(${k})` }}>
            <div
              style={{
                width: c,
                height: c,
                borderRadius: c * 0.18,
                background: col.fill,
                border: `5px solid ${col.stroke}`,
                display: "grid",
                placeItems: "center",
                fontFamily: theme.font,
                fontWeight: 900,
                fontSize: fs,
                color: col.text,
                boxSizing: "border-box",
              }}
            >
              {fmt(v)}
            </div>
          </div>
        );
      })}
      {showIndex &&
        cur.values.map((_, i) => (
          <div key={`i${i}`} style={{ position: "absolute", top: c + 10, left: x(i), width: c, textAlign: "center", fontFamily: theme.mono, fontSize: Math.min(34, c * 0.32), color: theme.muted }}>
            {i}
          </div>
        ))}
      {allNames.map((name) => {
        const a = prev.pointers[name], b = cur.pointers[name];
        if (b === undefined && a === undefined) return null;
        const stack = rowOf[name] ?? 0;
        const from = a ?? b!, to = b ?? a!;
        const px = mix(x(from), x(to), t) + c / 2;
        const opacity = b === undefined ? 1 - t : a === undefined ? t : 1;
        return <PointerMark key={name} x={px} y={pointerTop + stack * 86} name={name} color={colors[name]} opacity={opacity} size={pSize} />;
      })}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};

/** A string as an array of characters (same steps API as ArrayView). */
export const StringView: React.FC<{ text: string; steps?: ArrayStep[]; label?: string; showIndex?: boolean; cell?: number }> = ({ text, ...rest }) => (
  <ArrayView values={text.split("")} {...rest} />
);

/** Row of bits for bit-manipulation problems; index 0 is the least-significant bit (shown on the right). */
export const BitRow: React.FC<{ value: number; bits?: number; steps?: { at: number; value?: number; mark?: Marks; note?: string }[]; label?: string }> = ({ value, bits = 8, steps, label }) => {
  const toBits = (v: number) => Array.from({ length: bits }, (_, k) => ((v >> (bits - 1 - k)) & 1) as Val);
  const mapped: ArrayStep[] | undefined = steps?.map((s) => ({
    at: s.at,
    values: s.value === undefined ? undefined : toBits(s.value),
    // mark keys are bit positions (LSB = 0) → convert to cell index
    mark: s.mark ? Object.fromEntries(Object.entries(s.mark).map(([k, st]) => [bits - 1 - +k, st as State])) : undefined,
    note: s.note,
  }));
  return <ArrayView values={toBits(value)} steps={mapped} label={label} showIndex={false} cell={100} />;
};
