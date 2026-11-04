import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const C = { clamp: { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const };
  const s1 = spring({ frame: Math.max(0, f - sec(0.43)), fps, config: { damping: 14 } });
  const s2 = spring({ frame: Math.max(0, f - sec(1.43)), fps, config: { damping: 14 } });
  const s3 = spring({ frame: Math.max(0, f - sec(2.19)), fps, config: { damping: 14 } });
  const s4 = spring({ frame: Math.max(0, f - sec(5.75)), fps, config: { damping: 14 } });
  const b1o = interpolate(f, [sec(0.43) + 17, sec(0.43) + 26], [1, 0], C.clamp);
  const b2o = interpolate(f, [sec(1.43) + 15, sec(1.43) + 24], [1, 0], C.clamp);
  const glow = interpolate(f, [sec(2.19), sec(2.19) + 30], [0.3, 0.75], C.clamp);
  const phoneOut = interpolate(f, [sec(7.63), sec(7.63) + 15], [1, 0], C.clamp);
  const qIn = interpolate(f, [sec(7.63), sec(7.63) + 15], [0, 1], C.clamp);
  const prog = ((f % 60) / 60) * 100;
  const bounce = (ph: number) => Math.sin(f * 0.22 + ph) * 20;
  const redX = (off: number) => (f * 9 + off) % 400;
  return (
    <Stage title="No filming, just cartoon" kicker="60 SECOND EXPLAINER">
      <Slot area="main">
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 36 }}>
          <div style={{ position: "relative", width: 520, height: 730, borderRadius: 54, border: `4px solid ${theme.line}`, background: "#0B1526", overflow: "hidden", boxShadow: `0 0 ${120 * glow + 40}px rgba(0,229,255,0.45)` }}>
            <div style={{ position: "absolute", top: 26, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 130, height: 130, borderRadius: 65, background: theme.accent3, boxShadow: `0 0 60px ${theme.accent3}` }} />
            </div>
            <div style={{ position: "absolute", top: 200, left: 0, right: 0, bottom: 120, opacity: phoneOut }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ position: "absolute", left: 110 + i * 110, top: 300 + bounce(i * 1.4), width: 44, height: 44, borderRadius: 22, background: theme.accent, boxShadow: `0 0 24px ${theme.accent}` }} />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <div key={"r" + i} style={{ position: "absolute", left: redX(i * 130), top: 420 + i * 44, width: 26, height: 26, borderRadius: 13, background: "#FF3B5C", boxShadow: "0 0 18px #FF3B5C" }} />
              ))}
              <div style={{ position: "absolute", top: 170, left: 0, right: 0, textAlign: "center", transform: `scale(${s3})`, opacity: interpolate(f, [sec(2.19), sec(2.19) + 4], [0, 1], C.clamp) }}>
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 62, color: theme.good, lineHeight: 1 }}>PURE</div>
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: "#F5F7FA", lineHeight: 1.05 }}>UNDERSTANDING</div>
              </div>
            </div>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: qIn }}>
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 380, color: theme.accent, textShadow: `0 0 90px ${theme.accent}` }}>?</div>
            </div>
            {b1o > 0 && (
              <div style={{ position: "absolute", top: 270, left: 40, right: 40, transform: `scale(${s1}) rotate(-8deg)`, opacity: b1o, background: "#FF2040", borderRadius: 22, padding: "18px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Icon name="Camera" size={56} color="#FFFFFF" />
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: "#fff" }}>NO FILMING</div>
              </div>
            )}
            {b2o > 0 && (
              <div style={{ position: "absolute", top: 270, left: 40, right: 40, transform: `scale(${s2}) rotate(6deg)`, opacity: b2o, background: "#FF2040", borderRadius: 22, padding: "18px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Icon name="Code" size={56} color="#FFFFFF" />
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: "#fff" }}>NO EDITING</div>
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ width: `${prog}%`, height: "100%", background: theme.accent, boxShadow: `0 0 24px ${theme.accent}` }} />
            </div>
            <div style={{ position: "absolute", top: 430, left: 0, right: 0, textAlign: "center", transform: `scale(${s4})`, opacity: interpolate(f, [sec(5.75), sec(5.75) + 4], [0, 1], C.clamp) }}>
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 64, color: "#fff" }}>Got a <span style={{ color: theme.accent3 }}>question?</span></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            <div style={{ fontFamily: theme.mono, fontSize: 44, color: "#F5F7FA", background: theme.panel, border: `2px solid ${theme.line}`, borderRadius: 16, padding: "8px 18px" }}>0:60</div>
            <Icon name="Heart" size={72} color="#FF3B5C" ring />
            <Icon name="Send" size={72} color={theme.accent} ring />
            <Icon name="RefreshCw" size={64} color={theme.accent2} />
          </div>
        </div>
      </Slot>
      <Slot area="below" at={sec(7.63)}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 56, color: "#F5F7FA", textAlign: "center" }}>60 SECOND <span style={{ color: theme.accent }}>CARTOON BACK</span></div>
      </Slot>
    </Stage>
  );
}