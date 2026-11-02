import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, random, spring } from "remotion";
import { theme, sec, Appear, Title } from "@kit";

const CX = 540;
const CY = 860;
const NUM_ARROWS = 130;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bSwarm = sec(0.66);
  const bStress = sec(1.36);
  const bLock = sec(2.1);

  const pop = spring({ frame, fps, config: { damping: 14 } });
  const cylScale = interpolate(pop, [0, 1], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const stress = interpolate(frame, [bStress, bStress + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const harsh = interpolate(frame, [bLock, bLock + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const amp = 2 + stress * 12 + harsh * 10;
  const shakeX = Math.sin(frame * 1.25) * amp + Math.sin(frame * 3.7) * amp * 0.45 * stress;
  const shakeY = Math.cos(frame * 1.7) * amp * 0.5 + Math.sin(frame * 4.3) * amp * 0.3 * stress;

  const flashPhase = Math.floor(frame / 4) % 2 === 0;
  let cylColor: string = theme.fg;
  if (frame >= bStress && frame < bLock) {
    cylColor = flashPhase ? theme.fg : "#FF3B3B";
  }
  if (frame >= bLock) {
    cylColor = "#FF2020";
  }

  const glowColor: string = frame >= bLock ? theme.accent2 : frame >= bStress ? theme.accent2 : theme.accent;
  const glowOpacity = 0.55 + stress * 0.4 + Math.sin(frame * 0.6) * 0.12;

  const ringScale = 1 + (Math.sin(frame * 0.55) * 0.5 + 0.5) * 0.18 * stress + harsh * 0.08;
  const ringOpacity = interpolate(frame, [bStress, bStress + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const countRaw = interpolate(frame, [sec(0.3), sec(1.1)], [0, 1000000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const countText = Math.floor(countRaw).toLocaleString("en-US");

  const badgeScale = 1 + Math.sin(frame * 0.65) * 0.08;
  const badgeGlow = 0.5 + (Math.sin(frame * 0.8) * 0.5 + 0.5) * 0.5;

  const vigPulse = (Math.sin(frame * 0.55) * 0.5 + 0.5) * 0.3 * stress + harsh * 0.18;
  const vigOp = stress * 0.45 + vigPulse;

  const arrows: React.ReactNode[] = [];
  for (let i = 0; i < NUM_ARROWS; i++) {
    const rEdge = random(`edge-${i}`);
    const rA = random(`pa-${i}`);
    const rB = random(`pb-${i}`);
    const rC = random(`pc-${i}`);
    const rD = random(`pd-${i}`);
    const edge = Math.floor(rEdge * 4) % 4;
    let sx = 540;
    let sy = 200;
    if (edge === 0) {
      sx = 60 + rA * 960;
      sy = 200;
    } else if (edge === 1) {
      sx = 1020;
      sy = 230 + rA * 1030;
    } else if (edge === 2) {
      sx = 60 + rA * 960;
      sy = 1280;
    } else {
      sx = 60;
      sy = 230 + rA * 1030;
    }
    const ang = rB * Math.PI * 2;
    const ex = CX + Math.cos(ang) * (118 + rC * 42);
    const ey = CY + Math.sin(ang) * (138 + rC * 42);
    const startF = bSwarm + Math.floor(rD * 12);
    const dur = 18 + Math.floor(rA * 12);
    if (frame < startF) {
      continue;
    }
    const pRaw = interpolate(frame, [startF, startF + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const p = pRaw * pRaw * (3 - 2 * pRaw);
    let x = sx + (ex - sx) * p;
    let y = sy + (ey - sy) * p;
    const arrived = interpolate(frame, [startF + dur, startF + dur + 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    x += Math.sin(frame * 0.7 + i * 1.7) * 11 * arrived;
    y += Math.cos(frame * 0.8 + i * 1.3) * 11 * arrived;
    const angleDeg = (Math.atan2(ey - sy, ex - sx) * 180) / Math.PI;
    const size = 16 + rB * 12;
    const op = interpolate(frame, [startF, startF + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    arrows.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          background: frame >= bLock && rC > 0.7 ? "#FF5A5A" : theme.fg,
          clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)",
          transform: `translate(${x}px, ${y}px) rotate(${angleDeg}deg)`,
          opacity: op,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      <Title text="A MILLION READS" at={0} y={250} size={100} color={theme.fg} />

      <Appear at={sec(0.3)} outAt={sec(1.36) - 3} dy={20} style={{ position: "absolute", top: 500, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.mono, fontWeight: 900, fontSize: 76, color: theme.accent3, letterSpacing: 2 }}>
          {countText}
        </div>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.fg, marginTop: 6, letterSpacing: 6 }}>
          READS / SEC
        </div>
      </Appear>

      {/* glow behind cylinder */}
      <div
        style={{
          position: "absolute",
          left: CX - 260,
          top: CY - 260,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: glowColor,
          opacity: glowOpacity * 0.28,
          filter: "blur(70px)",
        }}
      />

      {/* cylinder */}
      <AbsoluteFill style={{ top: 640, height: 460, alignItems: "center" }}>
        <div style={{ transform: `translate(${shakeX}px, ${shakeY}px) scale(${cylScale})` }}>
          <div
            style={{
              width: 300,
              height: 360,
              position: "relative",
              filter: `drop-shadow(0 0 42px ${glowColor}) drop-shadow(0 0 110px ${glowColor})`,
            }}
          >
            {/* body */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 40,
                width: 300,
                height: 270,
                background: cylColor,
                borderLeft: `8px solid ${cylColor}`,
                borderRight: `8px solid ${cylColor}`,
                borderBottom: `8px solid ${cylColor}`,
                borderBottomLeftRadius: 150,
                borderBottomRightRadius: 150,
                boxSizing: "border-box",
              }}
            />
            {/* mid bands */}
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 150,
                width: 284,
                height: 54,
                borderRadius: "50%",
                border: `6px solid ${frame >= bStress ? "#7A0B0B" : "#9AA3B2"}`,
                boxSizing: "border-box",
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 225,
                width: 284,
                height: 54,
                borderRadius: "50%",
                border: `6px solid ${frame >= bStress ? "#7A0B0B" : "#9AA3B2"}`,
                boxSizing: "border-box",
                opacity: 0.9,
              }}
            />
            {/* top cap */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 300,
                height: 96,
                borderRadius: "50%",
                background: cylColor,
                border: `8px solid ${cylColor}`,
                boxSizing: "border-box",
                boxShadow: `inset 0 -14px 26px rgba(0,0,0,0.35)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 34,
                top: 18,
                width: 232,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.55)",
                opacity: frame >= bLock ? 0.2 : 0.55,
              }}
            />
            {/* shine */}
            <div
              style={{
                position: "absolute",
                left: 36,
                top: 90,
                width: 34,
                height: 190,
                borderRadius: 17,
                background: "rgba(255,255,255,0.35)",
              }}
            />
            {/* cracks */}
            <svg width={300} height={360} style={{ position: "absolute", left: 0, top: 0, opacity: stress }}>
              <polyline points="90,120 130,170 110,220 150,270" fill="none" stroke="#FF0000" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points="220,110 190,170 215,215 185,280" fill="none" stroke="#FF0000" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points="150,130 170,180 145,230" fill="none" stroke="#7A0000" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>

          {/* warning ring */}
          <div
            style={{
              position: "absolute",
              left: -52,
              top: -52,
              width: 404,
              height: 464,
              borderRadius: "50%",
              border: `10px solid ${theme.accent3}`,
              transform: `scale(${ringScale})`,
              opacity: ringOpacity * (0.6 + (Math.sin(frame * 0.7) * 0.5 + 0.5) * 0.4),
              boxShadow: `0 0 34px ${theme.accent3}`,
              pointerEvents: "none",
            }}
          />
        </div>
      </AbsoluteFill>

      {/* swarm layer */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>{arrows}</AbsoluteFill>

      {/* overload badge below cylinder with padding */}
      <Appear at={bStress} dy={30} style={{ position: "absolute", top: 1130, width: "100%", alignItems: "center", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 62,
            letterSpacing: 4,
            color: "#FFFFFF",
            background: frame >= bLock ? "#D40000" : "#C4005A",
            padding: "18px 52px",
            borderRadius: 22,
            border: `6px solid ${theme.accent3}`,
            transform: `scale(${badgeScale})`,
            boxShadow: `0 0 ${30 + badgeGlow * 40}px ${theme.accent2}, 0 0 90px rgba(255,0,0,0.7)`,
          }}
        >
          OVERLOAD
        </div>
      </Appear>

      {/* red vignette */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          background: `radial-gradient(ellipse at center, transparent 42%, rgba(255,10,10,${vigOp.toFixed(3)}) 100%)`,
          opacity: 1,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}