import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, random } from "remotion";
import { theme, sec, ramp, Appear } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoomP = spring({ frame, fps, config: { damping: 14 } });
  const zoom = interpolate(zoomP, [0, 1], [0.55, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const globeScale = interpolate(frame, [sec(0), sec(1.2)], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const collectT = interpolate(frame, [sec(2.18), sec(3.7)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flyT = interpolate(frame, [sec(3.7), sec(4.25)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const openT = ramp(frame, sec(3.85), 12);
  const burst = interpolate(frame, [sec(3.7), sec(4.1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const burstExpand = interpolate(frame, [sec(3.7), sec(5.3)], [0.3, 1.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const burstFade = interpolate(frame, [sec(4.4), sec(5.5)], [0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const keyGlowBase = interpolate(frame, [sec(2.18), sec(2.7)], [6, 32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const keyPulse = 10 + Math.sin(frame * 0.18) * 8;
  const keyGlow = keyGlowBase + keyPulse * collectT + Math.sin(frame * 0.2) * 4;
  const keyFloat = Math.sin(frame * 0.09) * 12;

  const flowOpacity = interpolate(frame, [sec(2.18), sec(2.55)], [0, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashOffset = -frame * 3;

  const bgDash = -frame * 1.2;
  const globeSpin = -((frame * 3.2) % 440);

  const boxData = Array.from({ length: 8 }).map((_, i) => {
    const baseAngle = (i / 8) * Math.PI * 2;
    const angle = baseAngle + frame * 0.028;
    const radius = interpolate(frame, [sec(0), sec(2.18)], [430, 275], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const orbitX = 540 + Math.cos(angle) * radius;
    const orbitY = 800 + Math.sin(angle) * radius * 0.72;
    const targetX = 540 + (i - 3.5) * 88;
    const targetY = 1010 + Math.abs(i - 3.5) * 22 + (i % 2) * 28;
    const cx = orbitX + (targetX - orbitX) * collectT;
    const cy = orbitY + (targetY - orbitY) * collectT;
    const fx = cx + (540 - cx) * flyT;
    const fy = cy + (1180 - cy) * flyT;
    const appear = ramp(frame, sec(0.15) + i * 4, 12);
    const fadeAfter = 1 - ramp(frame, sec(5.0), 12) * 0.15;
    const scale = (0.7 + appear * 0.3) * (1 - flyT * 0.35) * globeScale;
    return { fx, fy, appear, scale, opacity: appear * fadeAfter, angle };
  });

  const rainLocks = Array.from({ length: 26 }).map((_, k) => {
    const r1 = random(`rain-x-${k}`);
    const r2 = random(`rain-y-${k}`);
    const r3 = random(`rain-d-${k}`);
    const delay = r3 * 18;
    const start = sec(1.42) + delay;
    const end = sec(2.2) + delay;
    const p = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const sideLeft = r1 > 0.5;
    const xStart = sideLeft ? 40 + r2 * 220 : 820 + r2 * 220;
    const xEnd = 340 + random(`rain-xe-${k}`) * 400;
    const yStart = 240;
    const yEnd = 620 + r1 * 380;
    const x = xStart + (xEnd - xStart) * p;
    const y = yStart + (yEnd - yStart) * p;
    const vis = frame >= sec(1.42) && frame <= sec(2.9) && p > 0 && p < 1 ? 1 : 0;
    const rot = (r2 - 0.5) * 50 + p * 30;
    return { x, y, rot, vis, s: 0.7 + r3 * 0.7 };
  });

  const sparkles = Array.from({ length: 32 }).map((_, k) => {
    const a = random(`sp-a-${k}`) * Math.PI * 2;
    const sp = 4 + random(`sp-s-${k}`) * 9;
    const dt = Math.max(0, frame - sec(3.85));
    const dist = dt * sp;
    const x = 540 + Math.cos(a) * dist;
    const y = 1130 + Math.sin(a) * dist * 0.85 - dt * 2.2;
    const o = interpolate(dt, [0, 42], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const sz = 8 + random(`sp-z-${k}`) * 18;
    return { x, y, o, sz, star: k % 3 === 0 };
  });

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* faint dotted background flows */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.5 }}>
        <path
          d="M -40 650 Q 300 700 540 800 Q 780 900 1120 750"
          fill="none"
          stroke={theme.muted}
          strokeWidth={3}
          strokeDasharray="6 14"
          strokeDashoffset={bgDash}
          opacity={0.45}
        />
        <path
          d="M -40 950 Q 280 1000 540 1080 Q 800 1160 1120 1050"
          fill="none"
          stroke={theme.muted}
          strokeWidth={3}
          strokeDasharray="6 14"
          strokeDashoffset={-bgDash}
          opacity={0.4}
        />
        <path
          d="M 120 300 Q 400 500 540 800"
          fill="none"
          stroke={theme.muted}
          strokeWidth={2.5}
          strokeDasharray="4 12"
          strokeDashoffset={bgDash * 0.7}
          opacity={0.3}
        />
        <path
          d="M 960 320 Q 700 520 540 800"
          fill="none"
          stroke={theme.muted}
          strokeWidth={2.5}
          strokeDasharray="4 12"
          strokeDashoffset={-bgDash * 0.7}
          opacity={0.3}
        />
        {/* redirect flows to server */}
        <g opacity={flowOpacity}>
          <path
            d="M 200 800 Q 350 1000 500 1150"
            fill="none"
            stroke={theme.accent}
            strokeWidth={5}
            strokeDasharray="10 12"
            strokeDashoffset={dashOffset}
            opacity={0.9}
          />
          <path
            d="M 880 800 Q 730 1000 580 1150"
            fill="none"
            stroke={theme.accent}
            strokeWidth={5}
            strokeDasharray="10 12"
            strokeDashoffset={dashOffset}
            opacity={0.9}
          />
          <path
            d="M 540 950 L 540 1070"
            fill="none"
            stroke={theme.accent3}
            strokeWidth={6}
            strokeDasharray="12 10"
            strokeDashoffset={dashOffset * 1.4}
            opacity={0.95}
          />
        </g>
      </svg>

      {/* camera zoom world */}
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          left: 0,
          top: 0,
          transform: `scale(${zoom})`,
          transformOrigin: "540px 950px",
        }}
      >
        {/* GLOBE center 540,800 */}
        <div
          style={{
            position: "absolute",
            left: 540 - 230 * globeScale,
            top: 800 - 230 * globeScale,
            width: 460 * globeScale,
            height: 460 * globeScale,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: `${7 * globeScale}px solid ${theme.fg}`,
              boxShadow: `0 0 ${40 + Math.sin(frame * 0.12) * 12}px ${theme.accent}, inset 0 0 40px rgba(0,229,255,0.25)`,
              background: "rgba(0,229,255,0.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* rotating continents strip */}
            <div style={{ position: "absolute", left: globeSpin, top: 0, width: 880, height: "100%", display: "flex" }}>
              {[0, 1].map((rep) => (
                <div key={rep} style={{ width: 440, height: "100%", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", left: 90, top: 90, width: 150, height: 90, background: theme.accent, borderRadius: "48% 52% 60% 40%", opacity: 0.9 }} />
                  <div style={{ position: "absolute", left: 240, top: 200, width: 120, height: 140, background: theme.accent, borderRadius: "40% 60% 50% 50%", opacity: 0.85 }} />
                  <div style={{ position: "absolute", left: 70, top: 260, width: 100, height: 70, background: theme.accent, borderRadius: "50%", opacity: 0.8 }} />
                  <div style={{ position: "absolute", left: 300, top: 70, width: 80, height: 60, background: theme.accent, borderRadius: "50%", opacity: 0.75 }} />
                </div>
              ))}
            </div>
            {/* wireframe */}
            <svg width="100%" height="100%" viewBox="0 0 460 460" style={{ position: "absolute", left: 0, top: 0 }}>
              <ellipse cx={230} cy={230} rx={230} ry={90} fill="none" stroke={theme.fg} strokeWidth={4} opacity={0.9} />
              <ellipse cx={230} cy={230} rx={230} ry={180} fill="none" stroke={theme.fg} strokeWidth={3} opacity={0.55} />
              <ellipse
                cx={230}
                cy={230}
                rx={Math.abs(90 + Math.sin(frame * 0.04) * 60)}
                ry={230}
                fill="none"
                stroke={theme.fg}
                strokeWidth={4}
                opacity={0.9}
              />
              <ellipse
                cx={230}
                cy={230}
                rx={Math.abs(170 + Math.cos(frame * 0.04) * 50)}
                ry={230}
                fill="none"
                stroke={theme.fg}
                strokeWidth={3}
                opacity={0.5}
              />
              <line x1={0} y1={230} x2={460} y2={230} stroke={theme.fg} strokeWidth={3} opacity={0.6} />
            </svg>
          </div>
        </div>

        {/* SERVER tower at 540,1200 */}
        <div style={{ position: "absolute", left: 540 - 110, top: 1060, width: 220, height: 300 }}>
          <div
            style={{
              width: 220,
              height: 280,
              background: "#0A2B33",
              border: `6px solid ${theme.accent}`,
              borderRadius: 28,
              boxShadow: `0 0 ${30 + Math.sin(frame * 0.15) * 10 + burst * 50}px ${theme.accent}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {[0, 1, 2].map((r) => (
              <div key={r} style={{ marginTop: 22, marginLeft: 22, marginRight: 22, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: r === 1 && frame > sec(3.7) ? theme.accent3 : theme.good, boxShadow: `0 0 12px ${r === 1 && frame > sec(3.7) ? theme.accent3 : theme.good}` }} />
                <div style={{ flex: 1, height: 18, borderRadius: 9, background: "rgba(0,229,255,0.25)" }} />
                <div style={{ width: 60, height: 18, borderRadius: 9, background: "rgba(0,229,255,0.35)" }} />
              </div>
            ))}
            <div style={{ margin: "22px auto 0", width: 140, height: 34, borderRadius: 17, background: theme.accent, opacity: 0.9 }} />
            {/* burst fill */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: `${burst * 100}%`,
                background: `linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,214,0,0.7))`,
                opacity: burst * 0.9,
              }}
            />
          </div>
          <div style={{ textAlign: "center", marginTop: 10, color: theme.accent, fontFamily: theme.font, fontWeight: 900, fontSize: 48, letterSpacing: 2 }}>
            SERVER
          </div>
        </div>

        {/* GOLD private key beside server */}
        <div
          style={{
            position: "absolute",
            left: 720,
            top: 1090 + keyFloat,
            width: 170,
            height: 170,
            filter: `drop-shadow(0 0 ${keyGlow}px ${theme.accent3})`,
          }}
        >
          <svg width={170} height={170} viewBox="0 0 170 170">
            <circle cx={55} cy={55} r={32} fill="none" stroke={theme.accent3} strokeWidth={14} />
            <rect x={78} y={78} width={70} height={18} rx={9} fill={theme.accent3} transform="rotate(45 78 78)" />
            <rect x={108} y={108} width={18} height={28} rx={6} fill={theme.accent3} />
            <rect x={128} y={122} width={18} height={24} rx={6} fill={theme.accent3} />
            <circle cx={55} cy={55} r={10} fill={theme.accent3} opacity={0.9} />
          </svg>
          <div style={{ textAlign: "center", color: theme.accent3, fontFamily: theme.font, fontWeight: 900, fontSize: 48, marginTop: -8 }}>
            KEY
          </div>
        </div>

        {/* burst halo */}
        {frame >= sec(3.7) && (
          <div
            style={{
              position: "absolute",
              left: 540 - 220 * burstExpand,
              top: 1150 - 220 * burstExpand,
              width: 440 * burstExpand,
              height: 440 * burstExpand,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,214,0,0.6) 35%, rgba(0,229,255,0.2) 60%, transparent 70%)",
              opacity: burstFade,
            }}
          />
        )}

        {/* 8 orbiting locked boxes */}
        {boxData.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.fx - 45 * b.scale,
              top: b.fy - 38 * b.scale,
              width: 90 * b.scale,
              height: 76 * b.scale,
              opacity: b.opacity,
              transform: `rotate(${(Math.sin(b.angle) * 12).toFixed(2)}deg)`,
            }}
          >
            {/* glow when open */}
            <div
              style={{
                position: "absolute",
                left: -18,
                right: -18,
                top: -22,
                bottom: -18,
                borderRadius: 20,
                background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,214,0,0.5) 60%, transparent 70%)",
                opacity: openT,
              }}
            />
            {/* lid */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: openT > 0.5 ? -18 * b.scale : 0,
                width: "100%",
                height: 26 * b.scale,
                background: i % 2 === 0 ? theme.accent : theme.accent2,
                border: `${3 * b.scale}px solid ${theme.fg}`,
                borderRadius: 8,
                transform: openT > 0.5 ? "rotate(-22deg)" : "none",
                zIndex: 2,
              }}
            />
            {/* body */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 22 * b.scale,
                width: "100%",
                height: 50 * b.scale,
                background: "#102A33",
                border: `${3 * b.scale}px solid ${theme.fg}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ marginTop: 8 * b.scale, height: 8 * b.scale, background: openT > 0.5 ? theme.accent3 : theme.accent, marginLeft: 10, marginRight: 10, borderRadius: 4 }} />
            </div>
            {/* silver lock */}
            <div style={{ position: "absolute", left: "50%", top: 14 * b.scale, width: 30 * b.scale, height: 38 * b.scale, transform: "translateX(-50%)", zIndex: 3, opacity: openT > 0.5 ? 0.25 : 1 }}>
              <div style={{ position: "absolute", left: 3 * b.scale, top: 0, width: 24 * b.scale, height: 18 * b.scale, border: `${5 * b.scale}px solid #C9D4DC`, borderBottom: "none", borderRadius: `${12 * b.scale}px ${12 * b.scale}px 0 0` }} />
              <div style={{ position: "absolute", left: 0, bottom: 0, width: 30 * b.scale, height: 22 * b.scale, background: "#E8EEF3", border: `${2 * b.scale}px solid #8A9AA6`, borderRadius: 6 }} />
              <div style={{ position: "absolute", left: "50%", top: 20 * b.scale, width: 6 * b.scale, height: 10 * b.scale, background: "#5A6B77", borderRadius: 3, transform: "translateX(-50%)" }} />
            </div>
            {/* secret light inside when open */}
            {openT > 0 && (
              <div style={{ position: "absolute", left: 12, right: 12, top: 20, height: 30, background: theme.accent3, borderRadius: 8, opacity: openT, boxShadow: `0 0 18px ${theme.accent3}` }} />
            )}
          </div>
        ))}

        {/* raining tiny silver locks */}
        {rainLocks.map((l, k) =>
          l.vis ? (
            <div key={k} style={{ position: "absolute", left: l.x, top: l.y, opacity: l.vis, transform: `rotate(${l.rot}deg) scale(${l.s})` }}>
              <div style={{ width: 22, height: 28, position: "relative" }}>
                <div style={{ position: "absolute", left: 3, top: 0, width: 16, height: 12, border: "4px solid #C9D4DC", borderBottom: "none", borderRadius: "8px 8px 0 0" }} />
                <div style={{ position: "absolute", left: 0, bottom: 0, width: 22, height: 16, background: "#E8EEF3", border: "2px solid #8A9AA6", borderRadius: 4 }} />
              </div>
            </div>
          ) : null
        )}

        {/* white secret sparkles */}
        {frame >= sec(3.7) &&
          sparkles.map((s, k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                width: s.sz,
                height: s.sz,
                opacity: s.o,
                background: s.star ? theme.accent3 : theme.fg,
                borderRadius: s.star ? 4 : "50%",
                boxShadow: `0 0 14px ${s.star ? theme.accent3 : theme.fg}`,
                transform: `rotate(${frame * 3 + k * 20}deg)`,
              }}
            />
          ))}
      </div>

      {/* upper-mid text 1 */}
      <Appear at={sec(1.42)} outAt={sec(3.7)} dy={40} style={{ position: "absolute", top: 252, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.fg, fontFamily: theme.font, fontWeight: 900, fontSize: 96, lineHeight: 1.05 }}>
          Everyone can <span style={{ color: theme.accent }}>lock</span>
        </div>
      </Appear>

      {/* payoff text 2 */}
      <Appear at={sec(3.7)} dy={40} style={{ position: "absolute", top: 232, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.fg, fontFamily: theme.font, fontWeight: 900, fontSize: 92, lineHeight: 1.05 }}>
          whole internet
          <br />
          stays <span style={{ color: theme.accent3, textShadow: `0 0 24px ${theme.accent3}` }}>secret</span>
        </div>
      </Appear>
    </AbsoluteFill>
  );
}