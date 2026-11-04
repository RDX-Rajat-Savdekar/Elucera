import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b1 = sec(0.44);
  const b2 = sec(1.58);
  const b3 = sec(2.44);
  const b4 = sec(2.96);
  const snap = spring({ frame: f, fps, config: { damping: 14 } });
  const bounce = f >= b4 ? spring({ frame: f - b4, fps, config: { damping: 14 } }) : 0;
  const phoneScale = snap * (f >= b4 ? 1 + 0.08 * bounce : 1);
  const zoom = interpolate(f, [b3, b3 + 6, b3 + 17], [1, 1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const qOp = interpolate(f, [b2 - 6, b2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pOp = interpolate(f, [b2 - 6, b2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shakeEnv = interpolate(f, [b1, b1 + 6, b1 + 22], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shakeX = Math.sin(f * 0.9) * 14 * shakeEnv;
  const glow = 0.5 + 0.5 * Math.sin(f * 0.35);
  const s = (at: number) => (f >= at ? spring({ frame: f - at, fps, config: { damping: 14 } }) : 0);
  const sGot = s(0);
  const sQ = s(b1);
  const sSixty = s(b2);
  const sSecond = s(sec(1.94));
  const sCart = s(b3);
  const sBack = s(b4);
  const sunS = s(b3);
  const w = (sc: number) => ({ transform: `scale(${Math.max(0.001, sc)})`, opacity: sc > 0.05 ? 1 : 0, display: "inline-block" as const });
  return (
    <Stage>
      <Slot area="main">
        <div style={{ transform: `scale(${zoom})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <div style={{ transform: `scale(${Math.max(0.001, phoneScale)})`, width: 360, height: 470, borderRadius: 54, border: "10px solid #FFFFFF", background: "#10141F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${40 + glow * 50}px ${theme.accent}, inset 0 0 30px rgba(0,229,255,0.25)`, position: "relative" }}>
            <div style={{ opacity: qOp, transform: `translateX(${shakeX}px) scale(${1 + glow * 0.08})`, color: theme.accent, fontFamily: theme.font, fontWeight: 900, fontSize: 230, lineHeight: 1, textShadow: `0 0 30px ${theme.accent}, 0 0 90px ${theme.accent}` }}>?</div>
            <div style={{ position: "absolute", opacity: pOp, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", transform: `scale(${Math.max(0.001, sunS)})`, opacity: sunS > 0.05 ? 1 : 0 }}>
                <Icon name="Sun" size={300} color={theme.accent3} />
              </div>
              <div style={{ width: 190, height: 190, borderRadius: "50%", background: theme.accent2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${theme.accent2}` }}>
                <Icon name="Play" size={96} color="#FFFFFF" />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minHeight: 320 }}>
            <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
              <span style={{ ...w(sGot), fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.fg }}>Got</span>
              <span style={{ ...w(sQ), fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.accent }}>question?</span>
            </div>
            <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
              <span style={{ ...w(sSixty), fontFamily: theme.font, fontWeight: 900, fontSize: 84, color: theme.accent2 }}>60 SECOND</span>
            </div>
            <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
              <span style={{ ...w(sCart), fontFamily: theme.font, fontWeight: 900, fontSize: 100, color: theme.accent3 }}>CARTOON</span>
              <span style={{ ...w(sBack), fontFamily: theme.font, fontWeight: 900, fontSize: 100, color: theme.fg }}>back.</span>
            </div>
          </div>
        </div>
      </Slot>
    </Stage>
  );
}