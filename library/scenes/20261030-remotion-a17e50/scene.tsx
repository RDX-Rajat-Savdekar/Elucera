import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, random } from "remotion";
import { theme, sec, ramp, Highlight } from "@kit";

function KeySvg({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <circle cx={30} cy={50} r={18} fill="none" stroke={color} strokeWidth={11} />
      <rect x={44} y={44.5} width={42} height={11} rx={5.5} fill={color} />
      <rect x={70} y={44.5} width={9} height={22} rx={3} fill={color} />
      <rect x={81} y={44.5} width={7} height={15} rx={3} fill={color} />
    </svg>
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fLock = sec(0.82);
  const fOnly = sec(1.78);
  const fOpen = sec(2.44);

  // Padlock pop
  const padRaw = spring({ frame, fps, config: { damping: 10 } });
  const padScale = interpolate(padRaw, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const idleBob = Math.sin(frame * 0.12) * 7;

  // Shackle: open -32deg -> shut 0deg starting exactly at lock beat
  const shackleRotBase = interpolate(frame, [fLock, fLock + 8], [-32, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shackleDecay = interpolate(frame, [fLock + 8, fLock + 22], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shackleWobble = frame < fLock ? 0 : Math.sin((frame - fLock) * 0.9) * 4 * shackleDecay;
  const shackleRot = shackleRotBase + shackleWobble;

  // Shake after shut
  const shakeDecay = interpolate(frame, [fLock + 5, fLock + 26], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeAmp = interpolate(frame, [fLock, fLock + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = frame < fLock ? 0 : Math.sin((frame - fLock) * 0.95) * 16 * shakeAmp * shakeDecay;

  // Flash at shut
  const flashRise = interpolate(frame, [fLock + 5, fLock + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flashFall = interpolate(frame, [fLock + 8, fLock + 17], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flash = flashRise * flashFall;

  // Duplication puff ring
  const ringScale = interpolate(frame, [fOnly, fOnly + 15], [0.3, 1.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOp = interpolate(frame, [fOnly, fOnly + 15], [0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Silver explosion
  const expl = interpolate(frame, [fOnly, sec(2.38)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const explEase = 1 - (1 - expl) * (1 - expl);
  const silverOp = interpolate(frame, [fOnly, fOnly + 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gold key path: center -> side -> keyhole
  const goldX = interpolate(frame, [fOnly, sec(2.1), sec(2.92)], [540, 768, 560], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const goldY = interpolate(frame, [fOnly, sec(2.1), sec(2.92)], [850, 1030, 860], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const goldSpringRaw = spring({ frame: Math.max(0, frame - fOnly), fps, config: { damping: 12 } });
  const goldScale = interpolate(goldSpringRaw, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const goldRotBase = interpolate(frame, [fOpen, sec(2.95)], [-18, 342], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const goldWob = Math.sin(frame * 0.18) * 6;
  const goldGlow = interpolate(frame, [fOpen, fOpen + 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.25);
  const goldGlowPx = 12 + goldGlow * (26 + pulse * 22);

  const firstOp = 1 - ramp(frame, fOnly, 8);
  const secondOp = ramp(frame, fOnly, 8);

  const firstWords = [
    { w: "Anyone", at: sec(0.0) },
    { w: "can", at: sec(0.46) },
    { w: "lock", at: sec(0.82) },
    { w: "it.", at: sec(1.08) },
  ];
  const secondWords = [
    { w: "Only", at: sec(1.78) },
    { w: "you", at: sec(1.94) },
    { w: "can", at: sec(2.22) },
    { w: "open", at: sec(2.44) },
    { w: "it.", at: sec(2.74) },
  ];

  const bodyBg = frame < fLock ? "#1399AD" : theme.accent;
  const bgPulse = interpolate(pulse, [0, 1], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const SILVER = 16;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {/* ambient glow */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 520,
          width: 900,
          height: 900,
          borderRadius: 450,
          background: theme.accent,
          opacity: 0.08 + bgPulse * 0.04,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 200,
          width: 800,
          height: 200,
          borderRadius: 100,
          background: theme.accent2,
          opacity: 0.06,
        }}
      />

      {/* Headline 1 */}
      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "18px 28px",
          padding: "0 60px",
          opacity: firstOp,
        }}
      >
        {firstWords.map((wd, i) => {
          const o = interpolate(frame, [wd.at, wd.at + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sRaw = spring({ frame: Math.max(0, frame - wd.at), fps, config: { damping: 12 } });
          const s = interpolate(sRaw, [0, 1.25], [0, 1.25], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(sRaw, [0, 1], [70, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${y}px) scale(${Math.max(0.001, s)})`,
                fontFamily: theme.font,
                fontWeight: 900,
                fontSize: 92,
                lineHeight: 1,
                color: theme.fg,
                letterSpacing: -2,
              }}
            >
              {wd.w === "lock" ? (
                <Highlight at={sec(0.82)} color={theme.accent2}>
                  {wd.w}
                </Highlight>
              ) : (
                wd.w
              )}
            </span>
          );
        })}
      </div>

      {/* Headline 2 */}
      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "18px 28px",
          padding: "0 50px",
          opacity: secondOp,
        }}
      >
        {secondWords.map((wd, i) => {
          const o = interpolate(frame, [wd.at, wd.at + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sRaw = spring({ frame: Math.max(0, frame - wd.at), fps, config: { damping: 12 } });
          const y = interpolate(sRaw, [0, 1], [70, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${y}px) scale(${Math.max(0.001, sRaw)})`,
                fontFamily: theme.font,
                fontWeight: 900,
                fontSize: wd.w === "open" ? 98 : 88,
                lineHeight: 1,
                color: wd.w === "open" ? theme.accent3 : theme.fg,
                letterSpacing: -2,
              }}
            >
              {wd.w === "open" ? (
                <Highlight at={sec(2.44)} color={theme.accent3}>
                  {wd.w}
                </Highlight>
              ) : (
                wd.w
              )}
            </span>
          );
        })}
      </div>

      {/* puff ring */}
      <div
        style={{
          position: "absolute",
          left: 540 - 210,
          top: 850 - 210,
          width: 420,
          height: 420,
          borderRadius: 210,
          border: `14px solid ${theme.muted}`,
          opacity: ringOp,
          transform: `scale(${ringScale})`,
        }}
      />

      {/* silver flying keys */}
      {Array.from({ length: SILVER }).map((_, i) => {
        const ang = (i / SILVER) * Math.PI * 2 + random(`ang-${i}`) * 0.7;
        const dist = 320 + random(`dist-${i}`) * 420;
        const size = 46 + random(`size-${i}`) * 58;
        const rotBase = random(`rot-${i}`) * 360;
        const spinAmt = 70 + random(`spin-${i}`) * 200;
        const x = 540 + Math.cos(ang) * dist * explEase + Math.cos(frame * 0.1 + i * 1.1) * 14 * expl;
        const y = 860 + Math.sin(ang) * dist * explEase * 0.88 + Math.sin(frame * 0.13 + i * 1.4) * 14 * expl;
        const rot = rotBase + spinAmt * explEase + Math.sin(frame * 0.1 + i) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              opacity: silverOp,
              transform: `rotate(${rot}deg)`,
            }}
          >
            <KeySvg color={theme.muted} size={size} />
          </div>
        );
      })}

      {/* Padlock */}
      <div
        style={{
          position: "absolute",
          left: 540 - 180,
          top: 850 - 240 + idleBob * 0.4,
          width: 360,
          height: 520,
          transform: `scale(${Math.max(0.001, padScale)}) translateX(${shakeX}px)`,
          transformOrigin: "50% 60%",
        }}
      >
        {/* shackle */}
        <div
          style={{
            position: "absolute",
            left: 55,
            top: 10,
            width: 250 - 64,
            height: 210,
            border: `34px solid ${theme.accent3}`,
            borderBottom: "none",
            borderTopLeftRadius: 120,
            borderTopRightRadius: 120,
            transform: `rotate(${shackleRot}deg)`,
            transformOrigin: "17px 200px",
            background: "transparent",
            boxShadow: `0 0 ${18 + flash * 60}px rgba(255,214,0,${0.35 + flash * 0.6})`,
          }}
        />
        {/* shackle feet to hide gap when closed */}
        <div style={{ position: "absolute", left: 55, top: 190, width: 34, height: 70, background: theme.accent3, borderRadius: 8 }} />
        <div style={{ position: "absolute", left: 207, top: 190, width: 34, height: 70, background: theme.accent3, borderRadius: 8 }} />
        {/* body */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 230,
            width: 360,
            height: 270,
            background: bodyBg,
            borderRadius: 56,
            boxShadow: `0 18px 60px rgba(0,0,0,0.55), 0 0 ${24 + flash * 90}px rgba(0,229,255,${0.45 + flash * 0.5})`,
            border: "6px solid rgba(255,255,255,0.18)",
          }}
        />
        {/* keyhole */}
        <div
          style={{
            position: "absolute",
            left: 540 - 180 + 180 - 34,
            top: 230 + 78,
            width: 68,
            height: 68,
            borderRadius: 34,
            background: "#071423",
            border: "4px solid rgba(255,255,255,0.9)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 540 - 180 + 180 - 16,
            top: 230 + 128,
            width: 32,
            height: 72,
            borderRadius: 12,
            background: "#071423",
            border: "4px solid rgba(255,255,255,0.9)",
            borderTop: "none",
          }}
        />
        {/* flash */}
        <div
          style={{
            position: "absolute",
            left: -40,
            top: 140,
            width: 440,
            height: 440,
            borderRadius: 220,
            background: "white",
            opacity: flash * 0.85,
          }}
        />
      </div>

      {/* Gold key - stays center */}
      <div
        style={{
          position: "absolute",
          left: goldX - 90,
          top: goldY - 90,
          width: 180,
          height: 180,
          opacity: interpolate(frame, [fOnly, fOnly + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${Math.max(0.001, goldScale)}) rotate(${goldRotBase + goldWob}deg)`,
          filter: `drop-shadow(0 0 ${goldGlowPx}px ${theme.accent3})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -28,
            top: -28,
            width: 236,
            height: 236,
            borderRadius: 118,
            background: theme.accent3,
            opacity: 0.16 + goldGlow * (0.22 + pulse * 0.18),
          }}
        />
        <KeySvg color={theme.accent3} size={180} />
      </div>

      {/* gold label */}
      <div
        style={{
          position: "absolute",
          top: 1300,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [fOpen, fOpen + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: theme.mono,
            fontWeight: 800,
            fontSize: 52,
            letterSpacing: 4,
            color: theme.accent3,
            background: "rgba(255,214,0,0.12)",
            border: `3px solid ${theme.accent3}`,
            padding: "14px 36px",
            borderRadius: 999,
          }}
        >
          ★ YOUR KEY
        </span>
      </div>
    </AbsoluteFill>
  );
}