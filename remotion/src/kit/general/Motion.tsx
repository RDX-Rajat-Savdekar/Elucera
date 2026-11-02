import React from "react";
import { evolvePath } from "@remotion/paths";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../../theme";
import { clampOpts, ease, ramp, useSpringAt } from "../anim";

/**
 * An arrow that DRAWS itself from `from` to `to` (1080x1920 pixel coords) starting at frame `at`.
 * `bend` curves it (pixels of sideways bulge, ±). Optional `label` sits beside the midpoint, offset off the shaft.
 * Full-frame overlay: put it directly inside the scene root, not in a flex row.
 */
export const Arrow: React.FC<{
  from: [number, number];
  to: [number, number];
  at?: number;
  dur?: number;
  outAt?: number;
  color?: string;
  width?: number;
  bend?: number;
  label?: string;
  dashed?: boolean;
}> = ({ from, to, at = 0, dur = 14, outAt, color = theme.accent, width = 8, bend = 0, label, dashed = false }) => {
  const frame = useCurrentFrame();
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const cx = mx + nx * bend, cy = my + ny * bend;
  // stop short of the target so the head doesn't overlap it
  const ex = x2 - ((x2 - cx) / Math.hypot(x2 - cx, y2 - cy || 1)) * 6;
  const ey = y2 - ((y2 - cy) / Math.hypot(x2 - cx || 1, y2 - cy)) * 6;
  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${ex} ${ey}`;
  const p = ease(frame, at, dur);
  const out = outAt === undefined ? 0 : ramp(frame, outAt, 10);
  if (p <= 0 || out >= 1) return null;
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  const ang = Math.atan2(ey - cy, ex - cx);
  const head = 26;
  const hp = ramp(frame, at + dur - 4, 6);
  const lx = cx + nx * 46, ly = cy + ny * 46;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - out, pointerEvents: "none" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed && p >= 1 ? "18 16" : strokeDasharray} strokeDashoffset={dashed && p >= 1 ? 0 : strokeDashoffset} />
      <polygon
        points={`0,0 ${-head},${head * 0.55} ${-head},${-head * 0.55}`}
        fill={color}
        opacity={hp}
        transform={`translate(${ex} ${ey}) rotate(${(ang * 180) / Math.PI})`}
      />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={theme.fg} fontFamily={theme.font} fontWeight={800} fontSize={36} opacity={hp}
          stroke={theme.bg} strokeWidth={10} paintOrder="stroke">
          {label}
        </text>
      )}
    </svg>
  );
};

/** A rounded label bubble at (x, y) with a little pointer toward `side`. Absolute overlay. */
export const Callout: React.FC<{ x: number; y: number; text: string; at?: number; outAt?: number; color?: string; side?: "top" | "bottom" | "left" | "right"; size?: number }> = ({
  x,
  y,
  text,
  at = 0,
  outAt,
  color = theme.accent3,
  side = "bottom",
  size = 40,
}) => {
  const frame = useCurrentFrame();
  const s = useSpringAt(at);
  const out = outAt === undefined ? 0 : ramp(frame, outAt, 8);
  if (frame < at) return null;
  const tx = { top: "-50%, -100%", bottom: "-50%, 0%", left: "-100%, -50%", right: "0%, -50%" }[side];
  const gap = { top: "0 0 22px 0", bottom: "22px 0 0 0", left: "0 22px 0 0", right: "0 0 0 22px" }[side];
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}) scale(${0.7 + 0.3 * s})`, opacity: s * (1 - out), padding: gap }}>
      <div style={{ background: color, color: "#0B0F19", fontFamily: theme.font, fontWeight: 900, fontSize: size, padding: "12px 26px", borderRadius: 22, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

/** Small rounded tag. Inline (use inside flex rows). */
export const Pill: React.FC<{ text: string; at?: number; color?: string; solid?: boolean; size?: number }> = ({ text, at = 0, color = theme.accent, solid = false, size = 34 }) => {
  const s = useSpringAt(at);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "8px 22px",
        borderRadius: 999,
        border: `4px solid ${color}`,
        background: solid ? color : `${color}22`,
        color: solid ? "#0B0F19" : color,
        fontFamily: theme.font,
        fontWeight: 900,
        fontSize: size,
        opacity: s,
        transform: `scale(${0.7 + 0.3 * s})`,
      }}
    >
      {text}
    </span>
  );
};

/** A number that counts from `from` to `to` between `at` and `at+dur`. */
export const Counter: React.FC<{ from?: number; to: number; at?: number; dur?: number; decimals?: number; prefix?: string; suffix?: string; size?: number; color?: string; label?: string }> = ({
  from = 0,
  to,
  at = 0,
  dur = 30,
  decimals = 0,
  prefix = "",
  suffix = "",
  size = 160,
  color = theme.accent3,
  label,
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + dur], [from, to], { ...clampOpts, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const s = useSpringAt(at);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: s }}>
      <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: size, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {prefix}
        {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix}
      </div>
      {label && <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 40, color: theme.fg, marginTop: 14 }}>{label}</div>}
    </div>
  );
};

/** Horizontal progress bar filling to `value` (0–1) between `at` and `at+dur`. */
export const Progress: React.FC<{ value: number; at?: number; dur?: number; label?: string; color?: string; width?: number }> = ({ value, at = 0, dur = 24, label, color = theme.good, width = 860 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur) * value;
  return (
    <div style={{ width, opacity: ramp(frame, at - 6, 6) }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: theme.font, fontWeight: 800, fontSize: 38, color: theme.fg, marginBottom: 12 }}>
          <span>{label}</span>
          <span style={{ color }}>{Math.round(p * 100)}%</span>
        </div>
      )}
      <div style={{ height: 36, borderRadius: 18, background: theme.panel, border: `3px solid ${theme.line}`, overflow: "hidden" }}>
        <div style={{ width: `${p * 100}%`, height: "100%", background: color, borderRadius: 18 }} />
      </div>
    </div>
  );
};

/** Text that types itself out at `cps` characters per second, with a blinking-free caret. */
export const Typewriter: React.FC<{ text: string; at?: number; cps?: number; size?: number; color?: string; mono?: boolean }> = ({ text, at = 0, cps = 22, size = 64, color = theme.fg, mono = false }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor(((frame - at) / 30) * cps));
  if (frame < at) return null;
  const shown = text.slice(0, n);
  return (
    <div style={{ fontFamily: mono ? theme.mono : theme.font, fontWeight: 800, fontSize: size, color, textAlign: "center", padding: "0 70px", whiteSpace: "pre-wrap" }}>
      {shown}
      {n < text.length && <span style={{ color: theme.accent }}>▍</span>}
    </div>
  );
};

/** Scales its children up briefly at `at` (attention pulse). */
export const Pulse: React.FC<{ at: number; children: React.ReactNode; amount?: number }> = ({ at, children, amount = 0.12 }) => {
  const frame = useCurrentFrame();
  const t = ramp(frame, at, 14);
  const k = 1 + amount * Math.sin(Math.PI * t);
  return <div style={{ transform: `scale(${k})`, display: "inline-block" }}>{children}</div>;
};

/** Full-frame flash/fade to the background colour around frame `at` (a "cut" between shots). */
export const Cut: React.FC<{ at: number; dur?: number }> = ({ at, dur = 10 }) => {
  const frame = useCurrentFrame();
  const t = ramp(frame, at - dur / 2, dur);
  const o = Math.sin(Math.PI * t);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: theme.bg, opacity: o }} />;
};
