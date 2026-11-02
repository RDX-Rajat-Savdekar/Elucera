import React from "react";
import { Box, Bracket, Circle, CrossedOff, Highlight as RoughHighlight, StrikeThrough, Underline } from "@remotion/rough-notation";
import { useCurrentFrame } from "remotion";
import { theme } from "../../theme";
import { ease, ramp, useSpringAt } from "../anim";

/**
 * Hand-drawn annotation (Remotion's official rough-notation) around inline content, drawn from `at` over `dur`.
 * kind: circle | underline | box | highlight | strike | cross | bracket.
 */
export const Mark: React.FC<{ kind?: "circle" | "underline" | "box" | "highlight" | "strike" | "cross" | "bracket"; at: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  kind = "underline",
  at,
  dur = 16,
  color = theme.accent2,
  children,
}) => {
  const frame = useCurrentFrame();
  const progress = ease(frame, at, dur);
  const roomy = kind === "circle" || kind === "box" || kind === "bracket";
  const common = { progress, seed: 7, style: { display: "inline-block", margin: roomy ? "0 0.45em" : undefined } } as const;
  const stroke = { color, strokeWidth: 6 };
  switch (kind) {
    case "circle":
      return <Circle {...common} {...stroke} padding={{ left: 18, right: 18, top: 12, bottom: 12 }}>{children}</Circle>;
    case "box":
      return <Box {...common} {...stroke} padding={{ left: 14, right: 14, top: 8, bottom: 8 }}>{children}</Box>;
    case "highlight":
      return <RoughHighlight {...common} color={`${color}66`}>{children}</RoughHighlight>;
    case "strike":
      return <StrikeThrough {...common} {...stroke}>{children}</StrikeThrough>;
    case "cross":
      return <CrossedOff {...common} {...stroke}>{children}</CrossedOff>;
    case "bracket":
      return <Bracket {...common} {...stroke} bracketLeft bracketRight>{children}</Bracket>;
    default:
      return <Underline {...common} {...stroke}>{children}</Underline>;
  }
};

/** Big headline text block (not absolutely positioned; use inside a Slot). */
export const Headline: React.FC<{ text: string; at?: number; size?: number; color?: string; sub?: string }> = ({ text, at = 0, size = 88, color = theme.fg, sub }) => {
  const s = useSpringAt(at);
  return (
    <div style={{ textAlign: "center", padding: "0 70px", opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
      <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: size, color, lineHeight: 1.05 }}>{text}</div>
      {sub && <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: Math.round(size * 0.48), color: theme.muted, marginTop: 18 }}>{sub}</div>}
    </div>
  );
};

/** Numbered steps that reveal one by one; the step whose `activeAt` has passed most recently glows. */
export const StepList: React.FC<{ items: string[]; at?: number; stagger?: number; activeAt?: number[]; size?: number; width?: number }> = ({
  items,
  at = 0,
  stagger = 18,
  activeAt = [],
  size = 46,
  width = 900,
}) => {
  const frame = useCurrentFrame();
  const active = activeAt.reduce((cur, f, i) => (frame >= f ? i : cur), -1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width }}>
      {items.map((it, i) => {
        const p = ease(frame, at + i * stagger, 10);
        const on = i === active;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, opacity: p * (active >= 0 && !on ? 0.55 : 1), transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ flex: "none", width: size * 1.5, height: size * 1.5, borderRadius: "50%", display: "grid", placeItems: "center", background: on ? theme.accent3 : theme.panel, border: `4px solid ${on ? theme.accent3 : theme.line}`, color: on ? "#0B0F19" : theme.fg, fontFamily: theme.font, fontWeight: 900, fontSize: size * 0.8 }}>
              {i + 1}
            </div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: size, color: on ? theme.fg : theme.fg, lineHeight: 1.15 }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Two panels side by side ("before / after", "brute force / optimal"). */
export const Split: React.FC<{ left: { title: string; body?: React.ReactNode; color?: string }; right: { title: string; body?: React.ReactNode; color?: string }; at?: number; rightAt?: number; winner?: "left" | "right" }> = ({
  left,
  right,
  at = 0,
  rightAt,
  winner,
}) => {
  const frame = useCurrentFrame();
  const panel = (side: typeof left, start: number, win: boolean) => {
    const p = ease(frame, start, 12);
    const c = side.color ?? (win ? theme.good : theme.accent);
    return (
      <div style={{ flex: 1, minHeight: 260, borderRadius: 28, padding: "30px 26px", background: theme.panel, border: `5px solid ${c}`, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 46, color: c, textAlign: "center" }}>{side.title}</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 38, color: theme.fg, textAlign: "center" }}>{side.body}</div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 28, width: 960 }}>
      {panel(left, at, winner === "left")}
      {panel(right, rightAt ?? at + 12, winner === "right")}
    </div>
  );
};

/** Vertical timeline: each item's dot + label appear at its `at`. */
export const Timeline: React.FC<{ items: { label: string; sub?: string; at: number; color?: string }[]; width?: number }> = ({ items, width = 900 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "relative", width, display: "flex", flexDirection: "column", gap: 40, paddingLeft: 70 }}>
      <div style={{ position: "absolute", left: 26, top: 10, bottom: 10, width: 6, borderRadius: 3, background: theme.line }} />
      {items.map((it, i) => {
        const p = ease(frame, it.at, 12);
        const c = it.color ?? theme.accent;
        return (
          <div key={i} style={{ position: "relative", opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
            <div style={{ position: "absolute", left: -62, top: 8, width: 40, height: 40, borderRadius: "50%", background: c, boxShadow: `0 0 0 8px ${theme.bg}` }} />
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.fg }}>{it.label}</div>
            {it.sub && <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 34, color: theme.muted, marginTop: 6 }}>{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
};

/** Labelled horizontal bars growing in one after another; `highlight` index glows. */
export const BarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; at?: number; stagger?: number; unit?: string; highlight?: number; width?: number; max?: number }> = ({
  data,
  at = 0,
  stagger = 8,
  unit = "",
  highlight,
  width = 920,
  max,
}) => {
  const frame = useCurrentFrame();
  const m = max ?? Math.max(...data.map((d) => d.value), 1e-9);
  const labelW = 260;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26, width }}>
      {data.map((d, i) => {
        const p = ease(frame, at + i * stagger, 18);
        const c = d.color ?? (highlight === i ? theme.accent3 : theme.accent);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: labelW, flex: "none", textAlign: "right", fontFamily: theme.font, fontWeight: 800, fontSize: 38, color: theme.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ height: 56, width: `${(d.value / m) * 100 * p * 0.82}%`, minWidth: p > 0 ? 8 : 0, background: c, borderRadius: "0 12px 12px 0" }} />
              <div style={{ fontFamily: theme.mono, fontWeight: 800, fontSize: 36, color: theme.fg, opacity: ramp(frame, at + i * stagger + 12, 8), whiteSpace: "nowrap" }}>
                {Math.round(d.value * p * 10) / 10}
                {unit}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A terminal window: lines appear at their `at`; `cmd` lines get a prompt and type out. */
export const Terminal: React.FC<{ lines: { text: string; at: number; kind?: "cmd" | "out" | "ok" | "err" }[]; title?: string; width?: number; size?: number }> = ({
  lines,
  title = "terminal",
  width = 940,
  size = 34,
}) => {
  const frame = useCurrentFrame();
  const color = { cmd: theme.fg, out: "#AAB3C3", ok: theme.good, err: theme.bad };
  return (
    <div style={{ width, borderRadius: 24, background: "#070A12", border: `3px solid ${theme.line}`, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 22px", background: theme.panel }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c }} />)}
        <span style={{ marginLeft: 12, fontFamily: theme.mono, fontSize: 26, color: theme.muted }}>{title}</span>
      </div>
      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 12, minHeight: 200 }}>
        {lines.map((l, i) => {
          if (frame < l.at) return null;
          const kind = l.kind ?? "out";
          const n = kind === "cmd" ? Math.floor(((frame - l.at) / 30) * 28) : l.text.length;
          return (
            <div key={i} style={{ fontFamily: theme.mono, fontSize: size, color: color[kind], whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {kind === "cmd" && <span style={{ color: theme.accent }}>$ </span>}
              {l.text.slice(0, n)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
