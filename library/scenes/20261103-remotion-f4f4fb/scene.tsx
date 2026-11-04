import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tLock = sec(0.98);
  const tBurst = sec(1.98);
  const tYou = sec(2.36);
  const tGlow = sec(3.02);
  const locked = f >= tLock;
  const pop = locked ? spring({ frame: f - tLock, fps, config: { damping: 14 } }) : 0;
  const lockScale = locked ? 1.35 - 0.35 * pop : 1;
  const flash = interpolate(f, [tLock, tLock + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flashScale = interpolate(f, [tLock, tLock + 14], [0.6, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const txt1Op = interpolate(f, [tBurst, tBurst + 7], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const txt2Op = interpolate(f, [tBurst, tYou], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const txt1Y = interpolate(f, [0, 12], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const keyOp = interpolate(f, [tBurst - 6, tBurst + 8], [0.35, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const keyLift = interpolate(f, [tYou, tGlow + 15], [54, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const keyGlow = interpolate(f, [tYou, tGlow], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.5 + 0.5 * Math.sin(f / 7);
  const floatY = Math.sin(f / 12) * 8;
  const rim = interpolate(f, [tGlow, tGlow + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage>
      <Slot area="main">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, position: "relative", width: 900 }}>
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ opacity: txt1Op, transform: `translateY(${txt1Y}px)`, fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.fg, textAlign: "center", lineHeight: 1.05 }}>
              Anyone<br />can lock it.
            </div>
            <div style={{ position: "absolute", top: 0, opacity: txt2Op, fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg, textAlign: "center", lineHeight: 1.05 }}>
              Only <span style={{ color: theme.accent3 }}>YOU</span><br />can open it.
            </div>
          </div>
          <div style={{ position: "relative", width: 420, height: 420, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${floatY}px)` }}>
            <div style={{ position: "absolute", width: 380 * flashScale, height: 380 * flashScale, borderRadius: 999, border: `14px solid ${theme.accent}`, opacity: flash }} />
            <div style={{ transform: `scale(${lockScale})`, filter: locked ? `drop-shadow(0 0 ${30 + 40 * rim}px ${rim > 0.5 ? theme.accent3 : theme.accent})` : `drop-shadow(0 0 34px ${theme.accent})`, border: rim > 0 ? `6px solid ${theme.accent3}` : "6px solid transparent", borderRadius: 60, padding: 18 }}>
              {locked ? <Icon name="Lock" size={300} color={rim > 0.5 ? theme.accent3 : theme.accent} /> : <Icon name="Unlock" size={300} color={theme.accent} />}
            </div>
            {Array.from({ length: 20 }).map((_, i) => {
              const ang = (i / 20) * Math.PI * 2;
              const dist = interpolate(f, [tBurst, tBurst + 22], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const o = interpolate(f, [tBurst, tBurst + 6, tBurst + 30, tBurst + 40], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ position: "absolute", left: 210, top: 210, opacity: o, transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 60}px) scale(0.22)` }}>
                  <Icon name="Lock" size={120} color={theme.accent} />
                </div>
              );
            })}
          </div>
          <div style={{ opacity: keyOp, transform: `translateY(${keyLift}px)`, filter: `drop-shadow(0 0 ${12 + keyGlow * 34 + pulse * keyGlow * 22}px ${theme.accent3})` }}>
            <Icon name="Key" size={120} color={theme.accent3} />
          </div>
        </div>
      </Slot>
    </Stage>
  );
}