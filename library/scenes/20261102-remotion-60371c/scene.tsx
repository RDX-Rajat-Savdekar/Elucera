import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const theme = { bg: "#0B0E1A", fg: "#FFFFFF", accent: "#00E5FF", accent2: "#FF2FB3", accent3: "#FFE600", good: "#00E676", font: "Inter, system-ui, sans-serif" };
const sec = (t: number) => Math.round(t * 30);

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14 } });
  const headSc = interpolate(pop, [0, 1], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bubSc = interpolate(pop, [0, 1], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wobX = interpolate(f, [34, 40, 46, 52, 61], [1, 1.18, 0.9, 1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wobY = interpolate(f, [34, 40, 46, 52, 61], [1, 0.82, 1.12, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bubbleOut = interpolate(f, [sec(2.24), sec(2.24) + 7], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ticketOp = interpolate(f, [sec(2.24), sec(2.24) + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ticketIn = spring({ frame: Math.max(0, f - sec(2.24)), fps, config: { damping: 14 } });
  const pulse = interpolate(f, [sec(2.82), sec(2.82) + 7, 107], [1, 1.09, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const actuallyOp = interpolate(f, [sec(1.12), sec(1.12) + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const actuallySc = interpolate(f, [sec(1.12), sec(1.12) + 8], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeS = spring({ frame: Math.max(0, f - sec(2.82)), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: "center", fontFamily: theme.font }}>
      <div style={{ marginTop: 230, transform: `scale(${headSc})`, textAlign: "center", fontWeight: 900, lineHeight: 1.02 }}>
        <div style={{ fontSize: 104, color: theme.fg }}>How does <span style={{ color: theme.accent }}>AI</span></div>
        <div style={{ height: 112, marginTop: 8 }}>
          <div style={{ opacity: actuallyOp, transform: `scale(${actuallySc})`, fontSize: 92, color: theme.accent3, textShadow: `0 0 34px ${theme.accent3}` }}>actually</div>
        </div>
      </div>
      <div style={{ position: "relative", width: 840, height: 540, marginTop: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", opacity: bubbleOut, transform: `scale(${bubSc}) scaleX(${wobX}) scaleY(${wobY})` }}>
          <div style={{ background: "#FFFFFF", borderRadius: 90, padding: "50px 68px", display: "flex", flexDirection: "row", alignItems: "center", gap: 26 }}>
            <div style={{ width: 92, height: 92, borderRadius: 46, background: "#0B0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, color: "#fff" }}>{"\u2708"}</div>
            <div style={{ fontWeight: 900, fontSize: 62, color: "#0B0E1A", whiteSpace: "nowrap" }}>book a flight</div>
          </div>
        </div>
        <div style={{ position: "absolute", opacity: ticketOp, transform: `scale(${ticketIn * pulse})` }}>
          <div style={{ position: "relative", width: 800, background: "#FFFFFF", borderRadius: 36, border: `10px solid ${theme.accent}`, boxShadow: `0 0 90px ${theme.accent}`, display: "flex", flexDirection: "row" }}>
            <div style={{ width: 26, background: theme.accent2, borderRadius: "20px 0 0 20px" }} />
            <div style={{ flex: 1, padding: "42px 36px", display: "flex", flexDirection: "row", alignItems: "center", gap: 28 }}>
              <div style={{ width: 104, height: 104, borderRadius: 52, background: "#0B0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58, color: theme.accent }}>{"\u2708"}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 70, color: "#0B0E1A", lineHeight: 1 }}>PARIS</div>
                <div style={{ fontWeight: 800, fontSize: 48, color: "#0B0E1A", marginTop: 10 }}>Seat 14A</div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 18 }}>
                  {[10, 5, 14, 6, 10, 4, 12, 5, 9, 14, 6, 10, 5, 12].map((w, i) => (
                    <div key={i} style={{ width: w, height: 56, background: "#0B0E1A" }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ position: "absolute", top: -46, right: -22, width: 118, height: 118, borderRadius: 59, background: theme.good, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${badgeS})`, border: "6px solid #fff", fontSize: 64, fontWeight: 900, color: "#fff" }}>{"\u2713"}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}