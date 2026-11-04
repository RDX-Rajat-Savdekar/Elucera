import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Headline, Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globeS = spring({ frame: Math.max(0, f - sec(0.63)), fps, config: { damping: 14 } });
  const globeSc = interpolate(globeS, [0, 1], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockS = spring({ frame: Math.max(0, f - sec(5.63)), fps, config: { damping: 14 } });
  const lockSc = interpolate(lockS, [0, 1], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (1 + Math.sin(f / 8) * 0.04);
  const keyY = interpolate(f, [sec(7.07), sec(7.8)], [90, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const keyOp = interpolate(f, [sec(7.07), sec(7.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pubOp = interpolate(f, [sec(4.09), sec(4.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shieldOp = interpolate(f, [sec(4.5), sec(4.7)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = Math.max(0, f - sec(2.51));
  const a1 = -0.7 + t * 0.038;
  const a2 = 2.1 + t * 0.038;
  const x1 = 300 * Math.cos(a1);
  const y1 = 205 * Math.sin(a1);
  const x2 = 300 * Math.cos(a2);
  const y2 = 205 * Math.sin(a2);
  const showB = f >= sec(2.51);
  const open = f >= sec(7.07);
  return (
    <Stage>
      <Slot area="main" at={sec(0.63)} outAt={sec(5.63) - 3}>
        <div style={{ position: "relative", width: 900, height: 720, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 500, height: 500, borderRadius: 250, border: "8px solid #5B7DBF", background: "rgba(91,125,191,0.10)", transform: `scale(${globeSc})`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", width: 500, height: 170, borderRadius: "50%", border: "3px solid rgba(91,125,191,0.55)" }} />
            <div style={{ position: "absolute", width: 170, height: 500, borderRadius: "50%", border: "3px solid rgba(91,125,191,0.55)" }} />
            <div style={{ position: "absolute", width: 380, height: 380, borderRadius: 190, border: "2px dashed rgba(6,214,213,0.5)" }} />
            <Icon name="Globe" size={150} color="#8AA3D6" />
          </div>
          {showB && (
            <div style={{ position: "absolute", left: `calc(50% + ${x1}px)`, top: `calc(50% + ${y1}px)`, transform: "translate(-50%,-50%)", width: 150, height: 150, borderRadius: 75, border: `4px solid ${theme.accent}`, background: "rgba(4,20,32,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: `0 0 28px ${theme.accent}` }}>
              <Icon name="CircleDollarSign" size={54} color={theme.accent} />
              <Icon name="Lock" size={26} color={theme.accent} />
            </div>
          )}
          {showB && (
            <div style={{ position: "absolute", left: `calc(50% + ${x2}px)`, top: `calc(50% + ${y2}px)`, transform: "translate(-50%,-50%)", width: 150, height: 150, borderRadius: 75, border: `4px solid ${theme.accent}`, background: "rgba(4,20,32,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: `0 0 28px ${theme.accent}` }}>
              <Icon name="MessageCircle" size={54} color={theme.accent} />
              <Icon name="Lock" size={26} color={theme.accent} />
            </div>
          )}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 740, height: 120, borderRadius: 26, border: `4px dashed ${theme.accent2}`, background: "rgba(255,45,150,0.12)", display: "flex", alignItems: "center", justifyContent: "center", opacity: pubOp }}>
            <div style={{ fontFamily: theme.font, fontSize: 56, fontWeight: 900, color: theme.accent2, letterSpacing: 8 }}>PUBLIC</div>
          </div>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(190px,-190px)", opacity: shieldOp }}>
            <Icon name="ShieldCheck" size={84} color={theme.good} />
          </div>
          <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Icon name="Laptop" size={76} color={theme.fg} label="YOU" />
          </div>
        </div>
      </Slot>
      <Slot area="below" at={sec(0.63)} outAt={sec(2.51) - 2}>
        <Headline text="internet just works" size={72} color={theme.fg} />
      </Slot>
      <Slot area="below" at={sec(2.51)} outAt={sec(4.09) - 2}>
        <Headline text="bank stays safe" size={72} color={theme.fg} />
      </Slot>
      <Slot area="below" at={sec(4.09)} outAt={sec(5.63) - 3}>
        <Headline text="SAFE IN PUBLIC" size={80} color={theme.good} />
      </Slot>
      <Slot area="main" at={sec(5.63)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `scale(${lockSc})` }}>
          <div style={{ width: 300, height: 300, borderRadius: 150, border: `6px solid ${theme.accent}`, background: "rgba(6,214,213,0.12)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${theme.accent}, 0 0 120px rgba(6,214,213,0.5)` }}>
            <Icon name="Lock" size={170} color={theme.accent} />
          </div>
          <div style={{ opacity: keyOp, transform: `translateY(${keyY}px)`, filter: `drop-shadow(0 0 22px ${theme.accent3})` }}>
            <Icon name="Key" size={92} color={theme.accent3} />
          </div>
          <div style={{ opacity: keyOp, width: 300, height: 120, borderRadius: 24, border: `4px solid ${open ? theme.good : theme.accent}`, background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <Icon name={open ? "MessageCircle" : "Lock"} size={56} color={open ? theme.good : theme.accent} />
            <div style={{ fontFamily: theme.font, fontSize: 44, fontWeight: 800, color: open ? theme.good : theme.fg }}>{open ? "hello!" : "locked"}</div>
          </div>
        </div>
      </Slot>
      <Slot area="below" at={sec(5.63)} outAt={sec(7.07) - 2}>
        <Headline text="Anyone can lock it," size={76} color={theme.fg} />
      </Slot>
      <Slot area="below" at={sec(7.07)}>
        <Headline text="only you can open it." size={76} color={theme.accent3} />
      </Slot>
    </Stage>
  );
}