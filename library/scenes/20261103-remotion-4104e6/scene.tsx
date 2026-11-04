import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const b0 = sec(0.55);
  const b1 = sec(2.17);
  const b2 = sec(4.59);
  const b3 = sec(7.05);
  const b4 = sec(9.13);
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const drop = interpolate(f, [b0, b0 + 45], [0, 1], cl);
  const skyMix = interpolate(f, [b0, b1 + 10], [0, 1], cl);
  const blueOp = interpolate(f, [b1, b1 + 28], [1, 0], cl);
  const redW = interpolate(f, [b1, b2 + 18], [0.25, 1], cl);
  const eyeGlow = interpolate(f, [b2, b2 + 15], [0, 1], cl);
  const introBeam = interpolate(f, [8, b0], [1, 0], cl);
  const skyIn = interpolate(f, [5, b0], [0, 1], cl);
  const skyOut = interpolate(f, [b3 - 2, b3 + 1], [1, 0], cl);
  const beamIn = interpolate(f, [b3, b3 + 10], [0, 1], cl);
  const skyOp = Math.min(skyIn, skyOut);
  const shimmer = 0.7 + 0.3 * Math.sin(f * 0.35);
  const bluePeel = interpolate(f, [b1, b1 + 28], [0, -110], cl);
  const lab1 = interpolate(f, [b1, b1 + 10, b2 - 10, b2], [0, 1, 1, 0], cl);
  const lab2 = interpolate(f, [b2, b2 + 10, b3 - 12, b3], [0, 1, 1, 0], cl);
  const lab3 = interpolate(f, [b4, b4 + 10], [0, 1], cl);
  const sunY = 70 + drop * 360;
  return (
    <Stage title="Why sunsets turn red">
      <Slot area="main" outAt={b3 + 2}>
        <div style={{ opacity: skyOp, width: 880, height: 660, borderRadius: 36, overflow: "hidden", position: "relative", background: "#0B1020", border: `3px solid ${theme.line}` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#2FB7FF 0%,#7FDBFF 70%,#BDEFFF 100%)", opacity: 1 - skyMix }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,#3A1B6B 0%,${theme.accent2} 55%,#FF7A2F 80%,#FFB13D 100%)`, opacity: skyMix }} />
          <div style={{ position: "absolute", left: 150, top: sunY, width: 150, height: 150, borderRadius: "50%", background: skyMix > 0.5 ? "#FF4A2F" : "#FFE45C", boxShadow: `0 0 ${50 + shimmer * 50}px ${skyMix > 0.5 ? "#FF4A2F" : "#FFE45C"}`, opacity: skyOp }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 500, height: 6, background: theme.fg, opacity: 0.9 }} />
          <div style={{ position: "absolute", left: 300, top: 508, right: 200, height: 26, background: "#FF2020", borderRadius: 13, transformOrigin: "left center", transform: `scaleX(${Math.max(0.001, redW)})`, boxShadow: `0 0 ${20 + shimmer * 30}px #FF2020`, opacity: 0.35 + 0.65 * skyMix }} />
          <div style={{ position: "absolute", left: 190, top: 300 + bluePeel, opacity: blueOp, transform: "rotate(-38deg)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 110, height: 14, borderRadius: 7, background: theme.accent }} />
            <div style={{ fontSize: 48, color: theme.accent, fontWeight: 900 }}>{"->"}</div>
          </div>
          <div style={{ position: "absolute", left: 220, top: 360 + bluePeel * 1.3, opacity: blueOp, transform: "rotate(-24deg)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 130, height: 14, borderRadius: 7, background: theme.accent }} />
            <div style={{ fontSize: 48, color: theme.accent, fontWeight: 900 }}>{"->"}</div>
          </div>
          <div style={{ position: "absolute", right: 90, top: 430, width: 170, height: 170, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: `4px solid ${theme.fg}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: eyeGlow > 0.05 ? `0 0 ${60 * eyeGlow}px #FF2020` : "none" }}>
            <Icon name="Eye" size={96} color={eyeGlow > 0.5 ? "#FF2020" : theme.fg} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: introBeam }}>
            <div style={{ width: 860, height: 84, background: "#FFFFFF", borderRadius: 42, boxShadow: "0 0 60px #FFFFFF" }} />
          </div>
        </div>
      </Slot>
      <Slot area="main" at={b3}>
        <div style={{ opacity: beamIn, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <div style={{ width: 880, height: 90, background: theme.fg, borderRadius: 45, boxShadow: `0 0 ${40 + shimmer * 40}px #FFFFFF` }} />
          <div style={{ opacity: lab3, fontFamily: theme.font, fontWeight: 900, fontSize: 56, letterSpacing: 14, color: theme.accent }}>BLUE SKY</div>
        </div>
      </Slot>
      <Slot area="below">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 130 }}>
          <div style={{ opacity: lab1, fontFamily: theme.font, fontWeight: 800, fontSize: 52, color: theme.accent }}>BLUE SCATTERED AWAY</div>
          <div style={{ opacity: lab2, marginTop: -70, fontFamily: theme.font, fontWeight: 800, fontSize: 52, color: "#FF5A5A" }}>ONLY RED SURVIVES</div>
        </div>
      </Slot>
    </Stage>
  );
}