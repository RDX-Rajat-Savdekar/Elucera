import React from "react";
import { theme, type State } from "../../theme";
import { mix } from "../anim";
import { type Marks, Note, PointerMark, StructLabel, type Val, fitSize, fmt, mergeNullable, pointerPalette, stateColors, useSteps } from "./common";

// ─────────────────────────────── Grid / DP table / matrix ───────────────────────────────

export type GridStep = {
  at: number;
  /** fill cells: [[row, col, value], ...] — accumulates */
  set?: [number, number, Val | null][];
  /** cell states keyed "r,c"; REPLACES previous marks */
  mark?: Partial<Record<string, State>>;
  /** the cell being computed (yellow ring); null clears */
  active?: [number, number] | null;
  /** cells the active cell reads from → arrows (dp dependencies) */
  deps?: [number, number][];
  note?: string;
};
type GS = { data: (Val | null)[][]; mark: Partial<Record<string, State>>; active: [number, number] | null; deps: [number, number][]; note: string };

/**
 * 2-D grid for DP tables, matrices, game boards and grid BFS. `data` is the initial content (null = empty).
 * Optional row/column headers (e.g. the two strings of an edit-distance table).
 */
export const Grid: React.FC<{ data: (Val | null)[][]; steps?: GridStep[]; rowLabels?: Val[]; colLabels?: Val[]; label?: string; cell?: number; showIndex?: boolean }> = ({
  data,
  steps,
  rowLabels,
  colLabels,
  label,
  cell = 110,
  showIndex = false,
}) => {
  const base: GS = { data: data.map((r) => [...r]), mark: {}, active: null, deps: [], note: "" };
  const { prev, cur, t } = useSteps<GS, GridStep>(base, steps, (s, st) => {
    const d = s.data.map((r) => [...r]);
    for (const [r, c, v] of st.set ?? []) if (d[r]) d[r][c] = v;
    return { data: d, mark: st.mark ?? s.mark, active: st.active === undefined ? s.active : st.active, deps: st.deps ?? (st.active !== undefined ? [] : s.deps), note: st.note ?? s.note };
  });
  const rows = cur.data.length, cols = Math.max(...cur.data.map((r) => r.length));
  const hasRow = !!rowLabels || showIndex, hasCol = !!colLabels || showIndex;
  const gap = 8;
  const head = 64;
  const c = Math.min(cell, Math.floor((960 - (hasRow ? head : 0) - gap * cols) / cols), Math.floor((680 - (hasCol ? head : 0) - gap * rows) / rows));
  const ox = hasRow ? head + gap : 0, oy = hasCol ? head + gap : 0;
  const X = (j: number) => ox + j * (c + gap), Y = (i: number) => oy + i * (c + gap);
  const width = ox + cols * (c + gap) - gap, height = oy + rows * (c + gap) - gap + 70;
  const fs = Math.min(c * 0.42, 56);
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height }}>
      <StructLabel text={label} />
      {hasCol &&
        Array.from({ length: cols }, (_, j) => (
          <div key={`c${j}`} style={{ position: "absolute", left: X(j), top: 0, width: c, height: head, display: "grid", placeItems: "center", fontFamily: theme.mono, fontWeight: 800, fontSize: Math.min(40, c * 0.36), color: theme.accent }}>
            {fmt(colLabels ? colLabels[j] : j)}
          </div>
        ))}
      {hasRow &&
        Array.from({ length: rows }, (_, i) => (
          <div key={`r${i}`} style={{ position: "absolute", left: 0, top: Y(i), width: head, height: c, display: "grid", placeItems: "center", fontFamily: theme.mono, fontWeight: 800, fontSize: Math.min(40, c * 0.36), color: theme.accent }}>
            {fmt(rowLabels ? rowLabels[i] : i)}
          </div>
        ))}
      {cur.data.map((row, i) =>
        row.map((v, j) => {
          const key = `${i},${j}`;
          const col = stateColors(prev.mark[key], cur.mark[key], t);
          const appeared = (prev.data[i]?.[j] ?? null) === null && v !== null;
          const o = appeared ? t : 1;
          const isActive = cur.active && cur.active[0] === i && cur.active[1] === j;
          return (
            <div key={key} style={{ position: "absolute", left: X(j), top: Y(i), width: c, height: c, borderRadius: c * 0.14, background: col.fill, border: `${isActive ? 7 : 4}px solid ${isActive ? theme.accent3 : col.stroke}`, boxSizing: "border-box", display: "grid", placeItems: "center" }}>
              <span style={{ fontFamily: theme.font, fontWeight: 900, fontSize: fitSize(fmt(v), c, fs), color: col.text, opacity: o, transform: `scale(${0.6 + 0.4 * o})` }}>{fmt(v)}</span>
            </div>
          );
        }),
      )}
      {cur.active && cur.deps.length > 0 && (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
          {cur.deps.map(([r, cc], k) => {
            const [ar, ac] = cur.active!;
            const x1 = X(cc) + c / 2, y1 = Y(r) + c / 2, x2 = X(ac) + c / 2, y2 = Y(ar) + c / 2;
            const len = Math.hypot(x2 - x1, y2 - y1) || 1;
            const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
            // start just outside the source cell's number, end just outside the target's
            const sx = x1 + ux * c * 0.42, sy = y1 + uy * c * 0.42;
            const ex = mix(sx, x2 - ux * c * 0.42, t), ey = mix(sy, y2 - uy * c * 0.42, t);
            return <line key={k} x1={sx} y1={sy} x2={ex} y2={ey} stroke={theme.accent2} strokeWidth={7} strokeLinecap="round" opacity={0.9} />;
          })}
        </svg>
      )}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};

// ─────────────────────────────── Linked list ───────────────────────────────

export type ListStep = {
  at: number;
  /** next-pointer overrides by node index; MERGES. null = points to null. Default next of i is i+1. */
  links?: Partial<Record<number, number | null>>;
  /** named pointers (head, prev, curr, nxt, slow, fast…); MERGES, null removes */
  pointers?: Partial<Record<string, number | null>>;
  mark?: Marks;
  /** node indices that are unlinked/removed (faded) */
  removed?: number[];
  values?: Val[];
  note?: string;
};
type LS = { links: Partial<Record<number, number | null>>; pointers: Partial<Record<string, number>>; mark: Marks; removed: number[]; values: Val[]; note: string };

/** Singly linked list (≤ 7 nodes). Reversals draw the re-pointed arrow curving back above the row. */
export const LinkedList: React.FC<{ values: Val[]; steps?: ListStep[]; label?: string; nullTail?: boolean }> = ({ values, steps, label, nullTail = true }) => {
  const base: LS = { links: {}, pointers: {}, mark: {}, removed: [], values, note: "" };
  const { prev, cur, t } = useSteps<LS, ListStep>(base, steps, (s, st) => ({
    links: { ...s.links, ...(st.links ?? {}) },
    pointers: mergeNullable(s.pointers, st.pointers),
    mark: st.mark ?? s.mark,
    removed: st.removed ?? s.removed,
    values: st.values ?? s.values,
    note: st.note ?? s.note,
  }));
  const n = cur.values.length;
  const gapW = 54;
  const leftPad = (steps ?? []).some((s) => s.links && 0 in s.links && s.links[0] === null) ? 120 : 0;
  const c = Math.min(118, Math.floor((960 - leftPad - gapW * (n - 1) - (nullTail ? 90 : 0)) / n));
  const g = Math.max(gapW, Math.floor((960 - leftPad - (nullTail ? 90 : 0) - c * n) / Math.max(1, n - 1)));
  const X = (i: number) => leftPad + i * (c + g);
  const top = 150; // room above for back-arrows
  const width = X(n - 1) + c + (nullTail ? 90 : 0);
  const target = (s: LS, i: number) => (i in s.links ? s.links[i]! : i + 1 < n ? i + 1 : null);
  const names = Array.from(new Set((steps ?? []).flatMap((s) => Object.keys(s.pointers ?? {}))));
  const colors = pointerPalette(names);
  const rows: Record<number, string[]> = {};
  for (const nm of names) if (cur.pointers[nm] !== undefined) (rows[cur.pointers[nm]!] ??= []).push(nm);
  const ptrTop = top + c + 30;
  const height = ptrTop + Math.max(1, ...Object.values(rows).map((r) => r.length)) * 86 + 70;

  const arrow = (i: number, to: number | null, opacity: number, key: string) => {
    if (opacity <= 0.01) return null;
    const y = top + c / 2;
    if (to === null) {
      if (i === 0 && leftPad) {
        return (
          <g key={key} opacity={opacity}>
            <path d={`M ${X(0)} ${y} L ${X(0) - 46} ${y}`} stroke={theme.accent2} strokeWidth={7} strokeLinecap="round" markerEnd="url(#hb)" />
            <text x={X(0) - 64} y={y + 12} textAnchor="end" fontFamily={theme.mono} fontWeight={800} fontSize={32} fill={theme.muted}>null</text>
          </g>
        );
      }
      if (!nullTail || i !== n - 1) {
        // explicit null mid-list: small ⊘ above the node
        return <text key={key} x={X(i) + c / 2} y={top - 24} textAnchor="middle" fontFamily={theme.mono} fontSize={34} fill={theme.muted} opacity={opacity}>null</text>;
      }
      return <text key={key} x={X(i) + c + 22} y={y + 12} fontFamily={theme.mono} fontWeight={800} fontSize={34} fill={theme.muted} opacity={opacity}>null</text>;
    }
    const forward = to > i;
    const x1 = forward ? X(i) + c : X(i) + c * 0.3, x2 = forward ? X(to) - 8 : X(to) + c * 0.7;
    const d = forward && to === i + 1 ? `M ${x1} ${y} L ${x2} ${y}` : `M ${forward ? X(i) + c * 0.7 : x1} ${top} C ${forward ? X(i) + c * 0.7 : x1} ${top - 110}, ${forward ? X(to) + c * 0.3 : x2} ${top - 110}, ${forward ? X(to) + c * 0.3 : x2} ${top - 8}`;
    return (
      <g key={key} opacity={opacity}>
        <path d={d} fill="none" stroke={forward ? theme.accent : theme.accent2} strokeWidth={7} strokeLinecap="round" markerEnd={`url(#${forward ? "hf" : "hb"})`} />
      </g>
    );
  };
  return (
    <div style={{ position: "relative", width, height }}>
      <StructLabel text={label} top={0} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {[["hf", theme.accent], ["hb", theme.accent2]].map(([id, col]) => (
            <marker key={id} id={id} markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 z" fill={col} />
            </marker>
          ))}
        </defs>
        {cur.values.map((_, i) => {
          if (cur.removed.includes(i)) return null;
          const a = target(prev, i), b = target(cur, i);
          return a === b ? arrow(i, b, 1, `a${i}`) : [arrow(i, a, 1 - t, `p${i}`), arrow(i, b, t, `c${i}`)];
        })}
      </svg>
      {cur.values.map((v, i) => {
        const col = stateColors(prev.mark[i], cur.mark[i], t);
        const gone = cur.removed.includes(i) ? (prev.removed.includes(i) ? 1 : t) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: X(i), top: top + gone * 60, width: c, height: c, opacity: 1 - gone * 0.75, borderRadius: c * 0.22, background: col.fill, border: `5px solid ${col.stroke}`, boxSizing: "border-box", display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: fitSize(fmt(v), c, c * 0.45), color: col.text }}>
            {fmt(v)}
          </div>
        );
      })}
      {names.map((nm) => {
        const a = prev.pointers[nm], b = cur.pointers[nm];
        if (a === undefined && b === undefined) return null;
        const stack = b !== undefined ? rows[b].indexOf(nm) : 0;
        const px = mix(X(a ?? b!), X(b ?? a!), t) + c / 2;
        return <PointerMark key={nm} x={px} y={ptrTop + stack * 86} name={nm} color={colors[nm]} opacity={b === undefined ? 1 - t : a === undefined ? t : 1} />;
      })}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};

// ─────────────────────────────── Stack / queue / call stack ───────────────────────────────

export type SeqStep = { at: number; items: Val[]; mark?: Marks; note?: string };

/** Align a new item list against the old one: how many were removed from the FRONT (queue pops). */
function frontShift(a: Val[], b: Val[]) {
  for (let k = 0; k <= a.length; k++) {
    const rest = a.slice(k);
    if (rest.every((v, i) => b[i] === v)) return k;
  }
  return a.length;
}

/**
 * Stack (vertical, top up) or queue / deque (horizontal, front on the left). Each step gives the FULL contents;
 * pushes slide in, pops slide out. `kind="callstack"` renders wide frames like "fib(3)".
 */
export const SeqView: React.FC<{ kind?: "stack" | "queue" | "callstack"; items?: Val[]; steps?: SeqStep[]; label?: string; maxItems?: number }> = ({
  kind = "stack",
  items = [],
  steps,
  label,
  maxItems = 7,
}) => {
  type Q = { items: Val[]; mark: Marks; note: string };
  const { prev, cur, t } = useSteps<Q, SeqStep>({ items, mark: {}, note: "" }, steps, (s, st) => ({ items: st.items, mark: st.mark ?? {}, note: st.note ?? s.note }));
  const horizontal = kind === "queue";
  const show = cur.items.slice(-maxItems);
  const cw = horizontal ? Math.min(130, Math.floor(900 / Math.max(1, Math.min(maxItems, Math.max(cur.items.length, prev.items.length))))) : kind === "callstack" ? 520 : 260;
  const ch = horizontal ? cw : kind === "callstack" ? 92 : 104;
  const gap = 12;
  const width = horizontal ? Math.max(cw, maxItems * (cw + gap)) : cw + 190;
  const height = horizontal ? ch + 160 : maxItems * (ch + gap) + 140;
  const pos = (i: number) => (horizontal ? { left: i * (cw + gap), top: 40 } : { left: 30, top: height - 120 - (i + 1) * (ch + gap) });
  const shift = horizontal ? frontShift(prev.items, cur.items) : 0;
  const box = (v: Val, i: number, state: State | undefined, prevState: State | undefined, o: number, dx: number, dy: number, key: string) => {
    const col = stateColors(prevState, state, t);
    const p = pos(i);
    return (
      <div key={key} style={{ position: "absolute", left: p.left + dx, top: p.top + dy, width: cw, height: ch, opacity: o, borderRadius: 18, background: col.fill, border: `5px solid ${col.stroke}`, boxSizing: "border-box", display: "grid", placeItems: "center", fontFamily: kind === "callstack" ? theme.mono : theme.font, fontWeight: 900, fontSize: kind === "callstack" ? 42 : fitSize(fmt(v), cw, 52), color: col.text }}>
        {fmt(v)}
      </div>
    );
  };
  const out: React.ReactNode[] = [];
  if (horizontal) {
    prev.items.slice(0, shift).forEach((v, i) => out.push(box(v, i, "dim", "dim", 1 - t, -t * (cw + gap), 0, `out${i}`)));
    cur.items.forEach((v, i) => {
      const old = i + shift < prev.items.length;
      const fromIdx = old ? i + shift : i;
      const dx = old ? (fromIdx - i) * (cw + gap) * (1 - t) : (1 - t) * 160;
      out.push(box(v, i, cur.mark[i], old ? prev.mark[fromIdx] : cur.mark[i], old ? 1 : t, dx, 0, `q${i}`));
    });
  } else {
    const keep = Math.min(prev.items.length, cur.items.length);
    let same = 0;
    while (same < keep && prev.items[same] === cur.items[same]) same++;
    prev.items.slice(same).forEach((v, k) => out.push(box(v, same + k, "dim", "dim", 1 - t, 0, -t * 120, `po${k}`)));
    cur.items.forEach((v, i) => {
      if (i < same) out.push(box(v, i, cur.mark[i], prev.mark[i], 1, 0, 0, `s${i}`));
      else out.push(box(v, i, cur.mark[i], cur.mark[i], t, 0, -(1 - t) * 120, `s${i}`));
    });
  }
  const n = cur.items.length;
  const topIdx = n - 1;
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height }}>
      <StructLabel text={label ?? kind} top={horizontal ? -30 : -10} />
      {!horizontal && <div style={{ position: "absolute", left: 14, right: 14, bottom: 108, height: 8, borderRadius: 4, background: theme.line }} />}
      {out}
      {horizontal && n > 0 && (
        <>
          <PointerMark x={pos(0).left + cw / 2} y={40 + ch + 12} name="front" color={theme.accent3} size={34} />
          {n > 1 && <PointerMark x={pos(n - 1).left + cw / 2} y={40 + ch + 12} name="back" color={theme.accent} size={34} />}
        </>
      )}
      {!horizontal && n > 0 && (
        <div style={{ position: "absolute", left: cw + 40, top: pos(topIdx).top + ch / 2 - 22, fontFamily: theme.mono, fontWeight: 900, fontSize: 36, color: theme.accent3, opacity: t, whiteSpace: "nowrap" }}>◀ top</div>
      )}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};

// ─────────────────────────────── Hash map / set ───────────────────────────────

export type MapStep = { at: number; entries: [Val, Val][]; active?: Val | null; op?: string; note?: string };

/** Key → value table (hash map, counter, memo). Each step gives the FULL entries; new rows fade in, changed values flash. */
export const HashMapView: React.FC<{ entries?: [Val, Val][]; steps?: MapStep[]; label?: string; keyHeader?: string; valueHeader?: string; maxRows?: number; width?: number }> = ({
  entries = [],
  steps,
  label = "map",
  keyHeader = "key",
  valueHeader = "value",
  maxRows = 7,
  width = 640,
}) => {
  type H = { entries: [Val, Val][]; active: Val | null; op: string; note: string };
  const { prev, cur, t } = useSteps<H, MapStep>({ entries, active: null, op: "", note: "" }, steps, (s, st) => ({ entries: st.entries, active: st.active ?? null, op: st.op ?? "", note: st.note ?? s.note }));
  const rowH = 84;
  const old = new Map(prev.entries.map(([k, v]) => [String(k), v]));
  const rows = cur.entries.slice(-maxRows);
  const height = 90 + Math.max(1, rows.length) * (rowH + 8) + 70;
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height }}>
      <StructLabel text={label} top={-10} />
      <div style={{ position: "absolute", top: 40, left: 0, width, display: "flex", fontFamily: theme.mono, fontWeight: 800, fontSize: 32, color: theme.muted }}>
        <div style={{ flex: 1, paddingLeft: 24 }}>{keyHeader}</div>
        <div style={{ flex: 1, paddingLeft: 24 }}>{valueHeader}</div>
      </div>
      {rows.map(([k, v], i) => {
        const isNew = !old.has(String(k));
        const changed = !isNew && old.get(String(k)) !== v;
        const on = cur.active !== null && String(cur.active) === String(k);
        const o = isNew ? t : 1;
        const flash = changed ? Math.sin(Math.PI * t) : 0;
        return (
          <div key={String(k)} style={{ position: "absolute", top: 90 + i * (rowH + 8), left: 0, width, height: rowH, display: "flex", borderRadius: 16, overflow: "hidden", opacity: o, transform: `translateX(${(1 - o) * 40}px)`, border: `4px solid ${on ? theme.accent3 : theme.line}`, boxSizing: "border-box" }}>
            <div style={{ flex: 1, background: theme.panel, display: "flex", alignItems: "center", paddingLeft: 24, fontFamily: theme.mono, fontWeight: 900, fontSize: 42, color: on ? theme.accent3 : theme.fg }}>{fmt(k)}</div>
            <div style={{ flex: 1, background: changed ? `rgba(247,37,133,${0.15 + 0.35 * flash})` : "#11172A", display: "flex", alignItems: "center", paddingLeft: 24, fontFamily: theme.mono, fontWeight: 900, fontSize: 42, color: theme.fg }}>{fmt(v)}</div>
          </div>
        );
      })}
      {cur.op && <div style={{ position: "absolute", right: 0, top: -10, fontFamily: theme.mono, fontWeight: 900, fontSize: 36, color: theme.accent3 }}>{cur.op}</div>}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};
