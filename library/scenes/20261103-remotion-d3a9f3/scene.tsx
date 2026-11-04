import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Slot, Stage, sec, theme } from "@kit";

const RIB = ["#FF3B30", "#FF9500", "#FFD60A", "#34C759", "#00E5FF", "#4D7CFF"];
const NAMES = ["RED", "ORANGE", "YELLOW", "GREEN", "CYAN", "BLUE"];

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b0 = sec(0.45);
  const b1 = sec(2.77);
  const b2 = sec(5.93);
  const b3 = sec(7.57);
  const b4 = sec(8.91);
  const b5 = sec(10.65);
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const barX = interpolate(f, [b0, b0 + 18], [-420, 0], cl);
  const barOp = interpolate(f, [b0, b0 + 8], [0, 1], cl);
  const fan = interpolate(f, [b1, b1 + 30], [0, 1], cl);
  const whiteFade = 1 - interpolate(f, [b1, b1 + 15], [0, 1], cl);
  const earthS = f >= b2 ? spring({ frame: f - b2, fps, config: { damping: 14 } }) : 0;
  const earthOp = interpolate(f, [b2, b2 + 12], [0, 1], cl);
  const scat = interpolate(f, [b3, b3 + 18], [0, 1], cl);
  const spray = interpolate(f, [b4, b4 + 22], [0, 1], cl);
  const redP = interpolate(f, [b5, b5 + 20], [0, 1], cl);
  const tint = interpolate(f, [b4, b4 + 30], [0, 0.38], cl);
  const shimmer = 0.7 + 0.3 * Math.sin(f * 0.3);
  const exc = 600 + spray * 90;
  const dirs = [-70, -35, 0, 35, 70, 130, 180, -130];
  return (
    <Stage title="Sunlight Holds Every Color">
      <Slot area="main">
        <div style={{ position: "relative", width: 920, height: 680, overflow: "hidden", borderRadius: 28, background: `rgba(0,120,255,${tint})`, border: `2px solid ${theme.line}` }}>
          <div style={{ position: "absolute", top: 24, left: 40, opacity: whiteFade * barOp, fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: theme.fg }}>WHITE SUNLIGHT</div>
          <div style={{ position: "absolute", top: 110, left: 40 + barX, opacity: barOp * (0.3 + 0.7 * whiteFade + 0.7 * fan), width: 300, height: 30, background: "#FFFFFF", borderRadius: 15, boxShadow: `0 0 ${30 * shimmer}px #FFFFFF` }} />
          {RIB.map((c, i) => {
            const y = 170 + (i - 2.5) * (26 + fan * 26 + (f >= b2 ? 8 : 0));
            const w = 120 + fan * (360 + (f >= b2 ? 60 : 0));
            return (
              <div key={i} style={{ position: "absolute", top: y, left: 300, width: w, height: 18, background: c, borderRadius: 9, opacity: fan, boxShadow: `0 0 ${18 * shimmer}px ${c}` }}>
                {(i === 0 || i === 2 || i === 5) && (
                  <div style={{ position: "absolute", right: -14, top: -44, fontFamily: theme.font, fontWeight: 800, fontSize: 34, color: c }}>{NAMES[i]}</div>
                )}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: exc - 110, top: 130, width: 220, height: 220, borderRadius: "50%", background: "#1E6BFF", border: "6px solid rgba(0,229,255,0.9)", boxShadow: `0 0 ${50 * shimmer}px ${theme.accent}`, opacity: earthOp, transform: `scale(${Math.max(0.001, earthS)})`, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 30, top: 60, width: 70, height: 50, borderRadius: 25, background: "#3DDC84" }} />
            <div style={{ position: "absolute", left: 120, top: 120, width: 60, height: 44, borderRadius: 22, background: "#3DDC84" }} />
            <div style={{ position: "absolute", left: 60, top: 130, width: 90, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.9)" }} />
            <div style={{ position: "absolute", left: 90, top: 40, width: 70, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.85)" }} />
          </div>
          {dirs.map((a, i) => {
            const dist = 170 + spray * 70 + Math.sin(f * 0.25 + i) * 10;
            const rad = (a * Math.PI) / 180;
            const dx = Math.cos(rad) * dist;
            const dy = Math.sin(rad) * dist;
            return (
              <div key={i} style={{ position: "absolute", left: exc, top: 240, opacity: scat, transform: `translate(${dx}px,${dy}px) rotate(${a}deg)` }}>
                <div style={{ width: 64, height: 10, background: "#00E5FF", borderRadius: 5, boxShadow: "0 0 14px #00E5FF" }} />
                <div style={{ position: "absolute", right: -14, top: -9, borderLeft: "18px solid #00E5FF", borderTop: "14px solid transparent", borderBottom: "14px solid transparent" }} />
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 0, top: 232, width: 920, height: 16, opacity: Math.max(fan * 0.9, redP) }}>
            <div style={{ position: "absolute", left: 280 + redP * 120, width: 560 - redP * 120, height: 16, background: "#FF3B30", borderRadius: 8, boxShadow: "0 0 22px #FF3B30" }} />
            <div style={{ position: "absolute", left: 280 + redP * 120 + (560 - redP * 120), top: -12, borderLeft: "26px solid #FF3B30", borderTop: "20px solid transparent", borderBottom: "20px solid transparent" }} />
          </div>
          {f >= b5 && <div style={{ position: "absolute", left: 330, top: 90, fontFamily: theme.font, fontWeight: 900, fontSize: 44, color: "#FF3B30" }}>RED STRAIGHT</div>}
          {f >= b4 && f < b5 && <div style={{ position: "absolute", left: 330, top: 90, fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.accent }}>BLUE SCATTERS</div>}
        </div>
      </Slot>
      <Slot area="below" at={b4}>
        <div style={{ display: "flex", flexDirection: "row", gap: 24, justifyContent: "center" }}>
          <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 44, color: "#0B1020", background: theme.accent, borderRadius: 999, padding: "10px 34px" }}>BLUE SPRAYS</div>
          <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 44, color: "#FFF", background: "#FF3B30", borderRadius: 999, padding: "10px 34px", opacity: redP > 0.1 ? 1 : 0.35 }}>RED PASSES</div>
        </div>
      </Slot>
    </Stage>
  );
}