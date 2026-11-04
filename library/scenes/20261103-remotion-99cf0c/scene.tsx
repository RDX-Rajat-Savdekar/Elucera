import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Cut, Headline, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14 } });
  const slam = spring({ frame: f - sec(2.06), fps, config: { damping: 14 } });
  const headX = interpolate(f, [0, sec(2.06)], [-420, 1080], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const thick = interpolate(f, [sec(1.06), sec(1.48)], [30, 74], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(f, [sec(1.06), sec(1.48)], [18, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(f, [sec(1.06), sec(1.48)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const skyCut = f >= sec(2.98);
  const sunPulse = 1 + Math.sin(f / 9) * 0.06;
  return (
    <Stage>
      <Cut at={sec(2.98)} />
      {!skyCut && (
        <Slot area="main" at={0} outAt={sec(2.06) - 2}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 90, transform: `scale(${interpolate(pop, [0, 1], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`, opacity: interpolate(f, [sec(2.06) - 8, sec(2.06) - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <Headline text="SUNLIGHT" size={108} color={theme.fg} />
            <div style={{ position: "relative", width: 920, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 920, height: thick, background: "#FFFFFF", borderRadius: 999, boxShadow: `0 0 ${glow}px #FFFFFF, 0 0 ${glow * 2}px rgba(255,255,255,0.7)`, opacity: 0.95 }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: headX, width: 260, background: "linear-gradient(90deg, rgba(255,255,255,0), #FFFFFF, rgba(255,255,255,0))", filter: "blur(6px)" }} />
            </div>
          </div>
        </Slot>
      )}
      {!skyCut && (
        <Slot area="below" at={sec(1.06)} outAt={sec(2.06) - 2}>
          <div style={{ opacity: labelOp, fontFamily: theme.font, fontSize: 52, fontWeight: 800, color: theme.muted, letterSpacing: 2 }}>white = all colors</div>
        </Slot>
      )}
      {!skyCut && (
        <Slot area="main" at={sec(2.06)} outAt={sec(2.98)}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `scale(${interpolate(slam, [0, 1], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>
            <div style={{ fontFamily: theme.font, fontSize: 96, fontWeight: 900, color: theme.fg }}>why is sky</div>
            <div style={{ fontFamily: theme.font, fontSize: 110, fontWeight: 900, color: theme.accent }}>BLUE?</div>
          </div>
        </Slot>
      )}
      {skyCut && (
        <AbsoluteFill style={{ background: "transparent" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 192, height: 1050, background: "linear-gradient(180deg, #0FB5E8 0%, #4FC9F5 45%, #BDE9FF 100%)" }} />
          <div style={{ position: "absolute", left: 340, top: 322, width: 400, height: 400, borderRadius: 200, background: "#FFFFFF", boxShadow: "0 0 120px 60px rgba(255,255,255,0.95), 0 0 260px 120px rgba(255,255,255,0.6)", transform: `scale(${sunPulse})` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 1050, height: 192, background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0))" }} />
        </AbsoluteFill>
      )}
      {skyCut && (
        <Slot area="main" at={sec(2.98)}>
          <div style={{ fontFamily: theme.font, fontSize: 110, fontWeight: 900, color: "#FFFFFF", textShadow: "0 6px 40px rgba(0,90,140,0.55)" }}>BLUE?</div>
        </Slot>
      )}
    </Stage>
  );
}