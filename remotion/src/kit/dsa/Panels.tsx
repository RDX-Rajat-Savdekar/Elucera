import React from "react";
import { useCurrentFrame } from "remotion";
import { theme, type State } from "../../theme";
import { ease, mix, ramp, useSpringAt } from "../anim";
import { type Marks, Note, StructLabel, type Val, fmt, mergeNullable, stateColors, useSteps } from "./common";

// ─────────────────────────────── Code panel with syntax highlighting ───────────────────────────────

const KEYWORDS: Record<string, string[]> = {
  python: "def return if elif else for while in not and or is None True False class import from as with lambda yield break continue pass try except finally raise global nonlocal len range enumerate zip min max sorted set dict list self heapq deque".split(" "),
  js: "function return if else for while of in const let var new class extends this null undefined true false break continue switch case default try catch finally throw typeof Math Map Set Array".split(" "),
  java: "public private protected static final void int long double boolean char String return if else for while new class extends implements this null true false break continue switch case default try catch finally throw Map HashMap Set HashSet List ArrayList Deque ArrayDeque Integer Math".split(" "),
  cpp: "int long double bool char void auto const return if else for while new class struct this nullptr true false break continue switch case default vector unordered_map unordered_set map set pair string queue stack priority_queue std using namespace include".split(" "),
  go: "func return if else for range var const type struct map make append len nil true false break continue switch case default package import".split(" "),
};
KEYWORDS.ts = KEYWORDS.js;

type Tok = { s: string; c: string };
function tokenize(line: string, lang: string): Tok[] {
  const kw = new Set(KEYWORDS[lang] ?? KEYWORDS.python);
  const comment = lang === "python" ? "#" : "//";
  const out: Tok[] = [];
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*|\s+|.)/g;
  const ci = line.indexOf(comment);
  const code = ci >= 0 && !/["']/.test(line.slice(0, ci)) ? line.slice(0, ci) : line;
  const rest = code === line ? "" : line.slice(code.length);
  const parts = code.match(re) ?? [];
  parts.forEach((p, i) => {
    let c: string = theme.fg;
    if (/^["']/.test(p)) c = theme.good;
    else if (/^\d/.test(p)) c = theme.accent3;
    else if (kw.has(p)) c = theme.accent2;
    else if (/^[A-Za-z_]/.test(p) && (parts[i + 1] === "(" || (parts[i + 1]?.trim() === "" && parts[i + 2] === "("))) c = theme.accent;
    else if (/^[^\w\s]$/.test(p)) c = "#AAB3C3";
    out.push({ s: p, c });
  });
  if (rest) out.push({ s: rest, c: theme.muted });
  return out;
}

export type CodeStep = { at: number; line?: number | [number, number] | null; reveal?: number; note?: string };

/**
 * Syntax-highlighted code (python | js | ts | java | cpp | go). Steps move the active-line highlight
 * (1-based line or [from, to]), reveal the first N lines, and show a note under the panel.
 * The font shrinks to fit the longest line in `width`.
 */
export const CodePanel: React.FC<{ code: string; lang?: string; steps?: CodeStep[]; title?: string; width?: number; maxFont?: number }> = ({
  code,
  lang = "python",
  steps,
  title,
  width = 960,
  maxFont = 38,
}) => {
  const lines = code.replace(/\t/g, "    ").split("\n");
  type C = { line: number | [number, number] | null; reveal: number; note: string };
  const { prev, cur, t } = useSteps<C, CodeStep>({ line: null, reveal: lines.length, note: "" }, steps, (s, st) => ({
    line: st.line === undefined ? s.line : st.line,
    reveal: st.reveal ?? s.reveal,
    note: st.note ?? s.note,
  }));
  const longest = Math.max(...lines.map((l) => l.length), 10);
  const fs = Math.min(maxFont, Math.floor((width - 120) / (longest * 0.62)));
  const lh = Math.round(fs * 1.45);
  const range = (l: C["line"]): [number, number] | null => (l === null ? null : Array.isArray(l) ? l : [l, l]);
  const a = range(prev.line) ?? range(cur.line), b = range(cur.line);
  const pad = 24;
  return (
    <div style={{ position: "relative", width }}>
      <div style={{ borderRadius: 24, background: "#0A0E18", border: `3px solid ${theme.line}`, overflow: "hidden" }}>
        {title && <div style={{ padding: "14px 24px", background: theme.panel, fontFamily: theme.mono, fontSize: 28, color: theme.muted }}>{title}</div>}
        <div style={{ position: "relative", padding: `${pad}px 0` }}>
          {b && a && (
            <div style={{ position: "absolute", left: 0, right: 0, top: pad + mix(a[0] - 1, b[0] - 1, t) * lh, height: mix(a[1] - a[0] + 1, b[1] - b[0] + 1, t) * lh, background: `${theme.accent3}22`, borderLeft: `8px solid ${theme.accent3}` }} />
          )}
          {lines.map((l, i) => {
            const shown = i < cur.reveal;
            const o = shown ? (i < prev.reveal ? 1 : t) : 0;
            return (
              <div key={i} style={{ position: "relative", display: "flex", height: lh, alignItems: "center", opacity: o, whiteSpace: "pre", fontFamily: theme.mono, fontSize: fs }}>
                <span style={{ width: fs * 2.2, flex: "none", textAlign: "right", paddingRight: fs * 0.7, color: "#3E4860" }}>{i + 1}</span>
                <span>{tokenize(l, lang).map((tk, k) => <span key={k} style={{ color: tk.c }}>{tk.s}</span>)}</span>
              </div>
            );
          })}
        </div>
      </div>
      {cur.note && <div style={{ marginTop: 18, textAlign: "center", fontFamily: theme.font, fontWeight: 800, fontSize: 40, color: theme.accent3, opacity: prev.note === cur.note ? 1 : t }}>{cur.note}</div>}
    </div>
  );
};

// ─────────────────────────────── Variable watch ───────────────────────────────

export type VarStep = { at: number; vars: Partial<Record<string, Val | null>> };

/** Live variables as chips ("i = 2", "maxLen = 3"); MERGES per step (null removes); changed values flash. */
export const VarWatch: React.FC<{ vars?: Record<string, Val>; steps?: VarStep[]; width?: number }> = ({ vars = {}, steps, width = 960 }) => {
  const { prev, cur, t } = useSteps<Partial<Record<string, Val>>, VarStep>(vars, steps, (s, st) => mergeNullable(s, st.vars));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", width }}>
      {Object.entries(cur).map(([k, v]) => {
        const changed = prev[k] !== v;
        const flash = changed ? Math.sin(Math.PI * Math.min(1, t * 1.2)) : 0;
        return (
          <div key={k} style={{ padding: "12px 26px", borderRadius: 18, background: changed ? `rgba(255,209,102,${0.12 + 0.3 * flash})` : theme.panel, border: `4px solid ${changed ? theme.accent3 : theme.line}`, fontFamily: theme.mono, fontWeight: 800, fontSize: 40, color: theme.fg, opacity: prev[k] === undefined ? t : 1, transform: `scale(${1 + 0.08 * flash})` }}>
            <span style={{ color: theme.muted }}>{k} = </span>
            <span style={{ color: changed ? theme.accent3 : theme.fg }}>{fmt(v)}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────── Problem card / complexity ───────────────────────────────

const DIFF = { Easy: theme.good, Medium: theme.accent3, Hard: theme.bad } as const;

/** LeetCode-style problem header: number, title, difficulty pill, tags, and an example input → output. */
export const ProblemCard: React.FC<{ title: string; num?: number; difficulty?: keyof typeof DIFF; tags?: string[]; input?: string; output?: string; at?: number; width?: number }> = ({
  title,
  num,
  difficulty = "Medium",
  tags = [],
  input,
  output,
  at = 0,
  width = 940,
}) => {
  const s = useSpringAt(at);
  const frame = useCurrentFrame();
  return (
    <div style={{ width, borderRadius: 30, padding: "34px 36px", background: theme.panel, border: `4px solid ${theme.line}`, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        {num !== undefined && <span style={{ fontFamily: theme.mono, fontWeight: 800, fontSize: 40, color: theme.muted }}>#{num}</span>}
        <span style={{ padding: "6px 20px", borderRadius: 999, background: `${DIFF[difficulty]}26`, color: DIFF[difficulty], fontFamily: theme.font, fontWeight: 900, fontSize: 32 }}>{difficulty}</span>
        {tags.map((tg, i) => (
          <span key={tg} style={{ padding: "6px 18px", borderRadius: 999, border: `3px solid ${theme.line}`, color: "#AAB3C3", fontFamily: theme.font, fontWeight: 700, fontSize: 28, opacity: ramp(frame, at + 8 + i * 4, 8) }}>{tg}</span>
        ))}
      </div>
      <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: title.length > 24 ? 62 : 74, color: theme.fg, marginTop: 22, lineHeight: 1.05 }}>{title}</div>
      {(input || output) && (
        <div style={{ marginTop: 28, display: "grid", gap: 12, fontFamily: theme.mono, fontSize: 36, opacity: ramp(frame, at + 14, 10) }}>
          {input && <div><span style={{ color: theme.muted }}>Input: </span><span style={{ color: theme.fg }}>{input}</span></div>}
          {output && <div><span style={{ color: theme.muted }}>Output: </span><span style={{ color: theme.good }}>{output}</span></div>}
        </div>
      )}
    </div>
  );
};

/** Time / space complexity badges; `vs` shows the brute-force cost struck through first. */
export const Complexity: React.FC<{ time: string; space?: string; at?: number; vs?: { time?: string; space?: string } }> = ({ time, space, at = 0, vs }) => {
  const frame = useCurrentFrame();
  const badge = (k: string, v: string, old: string | undefined, start: number) => {
    const p = ease(frame, start, 12);
    const strike = old ? ease(frame, start + 10, 10) : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 34, color: theme.muted, letterSpacing: 2, textTransform: "uppercase" }}>{k}</div>
        {old && (
          <div style={{ position: "relative", fontFamily: theme.mono, fontWeight: 900, fontSize: 52, color: theme.muted }}>
            {old}
            <div style={{ position: "absolute", left: -6, top: "52%", height: 7, width: `${strike * 110}%`, background: theme.bad, borderRadius: 4 }} />
          </div>
        )}
        <div style={{ padding: "16px 34px", borderRadius: 24, background: `${theme.good}22`, border: `5px solid ${theme.good}`, fontFamily: theme.mono, fontWeight: 900, fontSize: 70, color: theme.good, opacity: old ? ramp(frame, start + 18, 10) : 1 }}>{v}</div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 70, justifyContent: "center", alignItems: "flex-end" }}>
      {badge("time", time, vs?.time, at)}
      {space && badge("space", space, vs?.space, at + 10)}
    </div>
  );
};

const CURVES: Record<string, (n: number) => number> = {
  "O(1)": () => 1,
  "O(log n)": (n) => Math.log2(n + 1),
  "O(n)": (n) => n,
  "O(n log n)": (n) => n * Math.log2(n + 1),
  "O(n²)": (n) => n * n,
  "O(2ⁿ)": (n) => Math.pow(2, n),
};
export type BigO = keyof typeof CURVES;

/** Growth curves for the common complexities; `highlight` glows and the rest dim. Curves draw in at `at`. */
export const ComplexityChart: React.FC<{ show?: BigO[]; highlight?: BigO; at?: number; width?: number; height?: number }> = ({
  show = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)"],
  highlight,
  at = 0,
  width = 900,
  height = 620,
}) => {
  const frame = useCurrentFrame();
  const N = 12;
  const maxY = 40;
  const colors: Record<string, string> = { "O(1)": theme.good, "O(log n)": theme.accent, "O(n)": theme.accent3, "O(n log n)": "#FF9F6B", "O(n²)": theme.accent2, "O(2ⁿ)": theme.bad };
  const px = (n: number) => 70 + (n / N) * (width - 200);
  const py = (v: number) => height - 60 - (Math.min(v, maxY) / maxY) * (height - 100);
  // label positions: highlighted curve labelled at its end; the rest spread so they never overlap
  const ends = show.map((k) => {
    let n = N, v = CURVES[k](N);
    if (v > maxY) { let lo2 = 0, hi2 = N; for (let it = 0; it < 30; it++) { const m = (lo2 + hi2) / 2; if (CURVES[k](m) > maxY) hi2 = m; else lo2 = m; } n = lo2; v = maxY; }
    return { k, x: px(n), y: py(v), top: CURVES[k](N) > maxY };
  });
  const placed = [...ends].sort((a, b) => a.y - b.y);
  for (let i = 1; i < placed.length; i++) if (!placed[i].top && placed[i].y - placed[i - 1].y < 38) placed[i].y = placed[i - 1].y + 38;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <line x1={70} y1={height - 60} x2={width - 120} y2={height - 60} stroke={theme.line} strokeWidth={5} />
      <line x1={70} y1={height - 60} x2={70} y2={30} stroke={theme.line} strokeWidth={5} />
      <text x={width - 120} y={height - 18} fill={theme.muted} fontFamily={theme.mono} fontSize={30} textAnchor="end">n →</text>
      {show.map((k, i) => {
        const p = ease(frame, at + i * 6, 24);
        const pts: string[] = [];
        for (let s = 0; s <= 60 * p; s++) {
          const n = (s / 60) * N;
          const v = CURVES[k](n);
          pts.push(`${px(n)},${py(v)}`);
          if (v > maxY) break;
        }
        const on = !highlight || highlight === k;
        const end = placed.find((e) => e.k === k)!;
        return (
          <g key={k} opacity={on ? 1 : 0.32}>
            <polyline points={pts.join(" ")} fill="none" stroke={colors[k]} strokeWidth={on && highlight ? 11 : 7} strokeLinecap="round" strokeLinejoin="round" />
            {p > 0.9 && (
              <text x={end.top ? end.x - 14 : end.x + 14} y={end.top ? Math.max(end.y + 30, 44) : end.y + 10} fill={colors[k]} fontFamily={theme.mono} fontWeight={900} fontSize={on && highlight ? 38 : 30} textAnchor={end.top ? "end" : "start"}>{k}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────── Intervals on a number line ───────────────────────────────

export type IntervalStep = { at: number; mark?: Marks; merged?: [number, number][]; sweep?: number | null; note?: string };

/** Intervals as bars on a number line (merge intervals, meeting rooms). `merged` draws the result row; `sweep` a vertical line. */
export const Intervals: React.FC<{ intervals: [number, number][]; steps?: IntervalStep[]; label?: string; width?: number }> = ({ intervals, steps, label, width = 960 }) => {
  type I = { mark: Marks; merged: [number, number][]; sweep: number | null; note: string };
  const { prev, cur, t } = useSteps<I, IntervalStep>({ mark: {}, merged: [], sweep: null, note: "" }, steps, (s, st) => ({
    mark: st.mark ?? s.mark,
    merged: st.merged ?? s.merged,
    sweep: st.sweep === undefined ? s.sweep : st.sweep,
    note: st.note ?? s.note,
  }));
  const lo = Math.min(...intervals.map((i) => i[0])), hi = Math.max(...intervals.map((i) => i[1]));
  const X = (v: number) => 30 + ((v - lo) / Math.max(1, hi - lo)) * (width - 60);
  const rowH = 74;
  const top = 20;
  const axisY = top + intervals.length * rowH + 20;
  const mergedY = axisY + 80;
  const height = mergedY + (cur.merged.length ? rowH : 0) + 80;
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => (hi - lo) / s <= 8) ?? Math.ceil((hi - lo) / 8);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height }}>
      <StructLabel text={label} />
      {intervals.map(([a, b], i) => {
        const col = stateColors(prev.mark[i], cur.mark[i], t);
        return (
          <div key={i} style={{ position: "absolute", top: top + i * rowH, left: X(a), width: Math.max(14, X(b) - X(a)), height: rowH - 18, borderRadius: 14, background: col.fill, border: `5px solid ${col.stroke}`, boxSizing: "border-box" }}>
            {/* label inside when it fits, otherwise just to the right of the bar */}
            <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", fontFamily: theme.mono, fontWeight: 800, fontSize: 30, color: col.text, ...(X(b) - X(a) >= `[${a},${b}]`.length * 19 + 16 ? { left: "50%", transform: "translate(-50%, -50%)" } : { left: "calc(100% + 12px)", color: theme.fg }) }}>[{a},{b}]</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: axisY, left: 30, width: width - 60, height: 5, background: theme.line }} />
      {ticks.map((v) => (
        <div key={v} style={{ position: "absolute", top: axisY + 12, left: X(v) - 30, width: 60, textAlign: "center", fontFamily: theme.mono, fontSize: 26, color: theme.muted }}>{v}</div>
      ))}
      {cur.merged.map(([a, b], i) => (
        <div key={`m${i}`} style={{ position: "absolute", top: mergedY, left: X(a), width: Math.max(14, X(b) - X(a)), height: rowH - 18, borderRadius: 14, background: `${theme.good}33`, border: `5px solid ${theme.good}`, boxSizing: "border-box", opacity: prev.merged.length > i ? 1 : t, display: "grid", placeItems: "center", fontFamily: theme.mono, fontWeight: 900, fontSize: 30, color: theme.good }}>
          [{a},{b}]
        </div>
      ))}
      {cur.sweep !== null && (
        <div style={{ position: "absolute", top: 0, height: axisY + 10, left: X(mix(prev.sweep ?? cur.sweep, cur.sweep, t)) - 3, width: 6, background: theme.accent3, borderRadius: 3 }} />
      )}
      <Note prev={prev.note} cur={cur.note} t={t} top={height - 56} width={width} />
    </div>
  );
};

/** Re-export the state type for scene authors. */
export type { State };
