import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
const sec = (t: number) => Math.round(t * 30);
const theme = { bg: "#0B1020", fg: "#F5F7FA", muted: "#8A93A6", accent: "#22D3EE", accent2: "#F471B5", accent3: "#FFD166", good: "#06D6A0", bad: "#FF4D6D", panel: "#151B2E", line: "#2A3350", font: "Inter,system-ui,sans-serif" };
function Stage({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: "center" }}>
      <div style={{ marginTop: 110, textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 34, color: theme.accent, letterSpacing: 4 }}>{kicker}</div>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 1080 }}>{children}</div>
    </AbsoluteFill>
  );
}
export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const on = (at: number) => interpolate(f, [at, at + 8], [0, 1], cl);
  const pop = (at: number) => spring({ frame: Math.max(0, f - at), fps, config: { damping: 14 } });
  const stampS = spring({ frame: Math.max(0, f - sec(21.09)), fps, config: { damping: 9 } });
  const loop = f >= sec(9.07) && f < sec(21.09) ? ((f - sec(9.07)) % 50) / 50 : -1;
  const upLoop = f >= sec(25.71) ? ((f - sec(25.71)) % 30) / 30 : -1;
  const sel = f >= sec(15.71);
  const booked = f >= sec(25.71);
  const pipeH = 110;
  return (
    <Stage title="Host books your flight" kicker="MCP FLOW">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 880, marginTop: 20 }}>
        <div style={{ opacity: on(sec(0.53)), transform: `scale(${pop(sec(0.53))})`, background: theme.fg, color: "#0B1020", borderRadius: 26, padding: "14px 28px", fontFamily: theme.font, fontWeight: 900, fontSize: 44 }}>
          {booked ? "You're booked! Seat 14A" : "book a flight to Paris"}
        </div>
        <div style={{ width: 8, height: 26, background: theme.accent, borderRadius: 4, opacity: on(sec(4.21)) }} />
        <div style={{ opacity: on(sec(4.21)), border: `4px solid ${theme.accent}`, background: theme.panel, borderRadius: 22, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 40, color: theme.fg }}>{"✦ host - assistant"}</div>
          <div style={{ opacity: on(sec(5.95)), transform: `scale(${pop(sec(5.95))})`, display: "flex", alignItems: "center", background: "#2A0E2E", border: `3px solid ${theme.accent2}`, borderRadius: 18, padding: "6px 14px", fontFamily: theme.font, fontWeight: 800, fontSize: 30, color: theme.accent2 }}>{"⚡ MCP client"}</div>
        </div>
        <div style={{ position: "relative", width: 10, height: pipeH, background: theme.accent, borderRadius: 5, opacity: on(sec(9.07)) }}>
          {loop >= 0 && <div style={{ position: "absolute", left: -8, top: loop * pipeH, width: 26, height: 26, borderRadius: 13, background: theme.accent2 }} />}
          {upLoop >= 0 && <div style={{ position: "absolute", left: -8, top: (1 - upLoop) * pipeH, width: 26, height: 26, borderRadius: 13, background: theme.good }} />}
        </div>
        <div style={{ opacity: on(sec(9.07)), transform: `scale(${pop(sec(9.07))})`, display: "flex", flexDirection: "row", alignItems: "center", gap: 20 }}>
          <div style={{ border: `4px solid ${theme.accent3}`, background: theme.panel, borderRadius: 22, padding: "10px 20px", fontFamily: theme.font, fontWeight: 800, fontSize: 36, color: theme.fg }}>{"◉ airline server"}</div>
          <div style={{ opacity: on(sec(12.75)), transform: `scale(${pop(sec(12.75))})`, background: theme.panel, border: `3px solid ${theme.line}`, borderRadius: 18, padding: "10px 16px", width: 340 }}>
            <div style={{ fontFamily: theme.font, fontSize: 32, fontWeight: 800, color: sel ? theme.muted : theme.fg }}>search flights</div>
            <div style={{ fontFamily: theme.font, fontSize: 34, fontWeight: 900, color: sel ? "#0B1020" : theme.fg, background: sel ? theme.accent3 : "transparent", borderRadius: 10, padding: "4px 10px", marginTop: 6, boxShadow: sel ? `0 0 22px ${theme.accent3}` : "none" }}>book flight</div>
            {f >= sec(18.31) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 28, color: "#0B1020", background: theme.accent, borderRadius: 20, padding: "4px 16px" }}>Paris</div>
                <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 28, color: "#0B1020", background: theme.accent, borderRadius: 20, padding: "4px 16px" }}>Friday</div>
              </div>
            )}
          </div>
        </div>
        {f >= sec(21.09) && (
          <div style={{ transform: `scale(${stampS}) rotate(-8deg)`, display: "flex", alignItems: "center", gap: 10, border: `5px solid ${theme.bad}`, borderRadius: 14, padding: "6px 20px", background: theme.panel }}>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.bad }}>Seat 14A ✓</div>
          </div>
        )}
      </div>
    </Stage>
  );
}