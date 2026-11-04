import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
const sec = (t: number) => Math.round(t * 30);
const theme = { bg: "#0B1020", fg: "#F5F7FA", muted: "#8A93A6", accent: "#22D3EE", accent2: "#F471B5", accent3: "#FFD166", bad: "#FF4D6D", panel: "#151B2E", font: "Inter,system-ui,sans-serif", mono: "JetBrains Mono,monospace" };
function Stage({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: "center" }}>
      <div style={{ marginTop: 150, textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 32, color: theme.accent, letterSpacing: 5 }}>{kicker}</div>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 1080 }}>{children}</div>
    </AbsoluteFill>
  );
}
function Slot({ children }: { area: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "center", width: 1080 }}>{children}</div>;
}
export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const on = (at: number) => interpolate(f, [at, at + 8], [0, 1], cl);
  const pop = (at: number) => spring({ frame: Math.max(0, f - at), fps, config: { damping: 14 } });
  const p1 = interpolate(f, [sec(4.13), sec(4.9)], [0, 1], cl);
  const p2 = interpolate(f, [sec(5.25), sec(6.1)], [0, 1], cl);
  const shaking = f >= sec(7.87) && f < sec(9.53) ? Math.sin(f * 0.9) * 10 : 0;
  const frozen = f >= sec(9.53);
  const flash = Math.floor(f / 7) % 2 === 0 ? 1 : 0.45;
  const drop = interpolate(f, [sec(9.53), sec(10.2)], [-220, 0], cl);
  const box = (e: string, c: string, l: string, at: number) => (
    <div style={{ opacity: on(at), transform: `scale(${pop(at)})`, textAlign: "center", width: 220 }}>
      <div style={{ background: theme.panel, border: `4px solid ${c}`, borderRadius: 24, padding: "18px 0", fontSize: 76 }}>{e}</div>
      <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 36, color: theme.fg, marginTop: 10 }}>{l}</div>
    </div>
  );
  return (
    <Stage title="Trapped in chat" kicker="BEFORE MCP">
      <Slot area="main">
        <div style={{ position: "relative", width: 920, height: 740, marginTop: 10 }}>
          <div style={{ opacity: on(sec(9.53)), transform: `translateY(${drop}) scale(${pop(sec(9.53))})`, position: "absolute", top: 0, left: 160, width: 600, background: theme.panel, border: `4px solid ${theme.accent}`, borderRadius: 28, padding: "12px 20px", textAlign: "center", zIndex: 5 }}>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 42, color: theme.fg }}>ONE STANDARD PLUG</div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 30, color: theme.accent }}>MCP FIXES IT</div>
          </div>
          <div style={{ opacity: on(sec(1.87)), position: "absolute", top: 168, left: 130, width: 660, height: 250, border: `5px dashed ${theme.muted}`, borderRadius: 30 }} />
          <div style={{ opacity: on(sec(0.41)), transform: `scale(${pop(sec(0.41))})`, position: "absolute", top: 190, left: 180, width: 560, background: "#FFFFFF", borderRadius: 26, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ opacity: f >= sec(1.87) ? 0.45 : 1, fontSize: 78 }}>{"💬"}</div>
            <div>
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 44, color: "#0B1020" }}>LANGUAGE MODEL</div>
              <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 32, color: "#0B1020" }}>TRAPPED IN CHAT</div>
            </div>
          </div>
          <svg width="920" height="740" style={{ position: "absolute", inset: 0, transform: `translateX(${frozen ? 0 : shaking}px)` }}>
            <path d="M460,420 C300,470 260,480 175,600" fill="none" stroke={theme.bad} strokeWidth={10} strokeDasharray={700} strokeDashoffset={(1 - p1) * 700} opacity={p1 * flash} strokeLinecap="round" />
            <path d="M460,420 C620,470 320,520 460,600" fill="none" stroke={theme.accent2} strokeWidth={10} strokeDasharray={700} strokeDashoffset={(1 - p2) * 700} opacity={p2 * (frozen ? 0.9 : flash)} strokeLinecap="round" />
            <path d="M460,420 C680,460 700,500 745,600" fill="none" stroke={theme.accent} strokeWidth={10} strokeDasharray={700} strokeDashoffset={(1 - p2) * 700} opacity={p2} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", top: 500, left: 0, width: 920, display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
            {box("📅", theme.accent3, "calendar", sec(4.13))}
            {box("✈️", theme.accent2, "flights", sec(5.25))}
            {box("🛢️", theme.accent, "postgres", sec(5.25))}
          </div>
          {f >= sec(4.13) && !frozen && (
            <div style={{ position: "absolute", top: 460, left: 250, background: theme.bad, color: "#fff", fontFamily: theme.font, fontWeight: 900, fontSize: 36, borderRadius: 30, width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", opacity: flash }}>X</div>
          )}
          {f >= sec(7.87) && (
            <div style={{ position: "absolute", top: 430, left: 540, display: "flex", gap: 10 }}>
              <div style={{ opacity: on(sec(7.87)), background: "#0B1020", border: `3px solid ${theme.bad}`, borderRadius: 12, padding: "6px 12px", fontFamily: theme.mono, fontSize: 26, color: theme.fg }}>custom()</div>
              <div style={{ opacity: on(sec(7.87)), background: theme.bad, color: "#fff", borderRadius: 20, padding: "6px 14px", fontFamily: theme.font, fontWeight: 900, fontSize: 26 }}>! MESS</div>
            </div>
          )}
        </div>
      </Slot>
    </Stage>
  );
}