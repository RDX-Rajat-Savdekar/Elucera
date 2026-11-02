import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";
import { theme, sec, Appear } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const F_CHLOR = sec(3.14);
  const F_COPPER = sec(4.02);
  const F_LEAD = sec(4.94);
  const F_CALC = sec(5.64);
  const F_MESH = sec(7.4);
  const F_DISS = sec(8.58);
  const F_CHEM = sec(11.16);

  const waterOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dotsOut = interpolate(frame, [315, 334], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fall = interpolate(frame, [F_DISS, F_CHEM], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const meshSlide = interpolate(frame, [F_MESH, F_MESH + 30], [1080, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const meshOpIn = interpolate(frame, [F_MESH, F_MESH + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const meshOpOut = interpolate(frame, [F_CHEM, F_CHEM + 15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const meshOp = meshOpIn * (1 - meshOpOut);
  const shakeEnv =
    interpolate(frame, [F_DISS, F_DISS + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    (1 - interpolate(frame, [sec(9.8), F_CHEM], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const shakeX = Math.sin(frame * 0.9) * 14 * shakeEnv;
  const shakeY = Math.cos(frame * 1.1) * 8 * shakeEnv;

  const xOp = interpolate(frame, [F_CHEM, F_CHEM + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (1 - interpolate(frame, [385, 400], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const chlorLabelOp =
    (1 - interpolate(frame, [F_CALC, F_CALC + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) *
    (1 - interpolate(frame, [F_MESH, F_MESH + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const otherLabelOp =
    1 - interpolate(frame, [F_MESH, F_MESH + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const glowPulse = 0.55 + Math.sin(frame / 15) * 0.15;
  const chemScale = 1 + Math.sin(frame / 12) * 0.03;

  const dots = [
    { key: "chlor", label: "CHLORINE", color: theme.good, x: 250, yBase: 660, at: F_CHLOR, ph: 0, labelOp: chlorLabelOp },
    { key: "copper", label: "COPPER", color: "#FF9F1C", x: 830, yBase: 700, at: F_COPPER, ph: 1.7, labelOp: otherLabelOp },
    { key: "lead", label: "LEAD", color: theme.accent2, x: 540, yBase: 870, at: F_LEAD, ph: 3.1, labelOp: otherLabelOp },
    { key: "calc", label: "CALCIUM", color: theme.fg, x: 540, yBase: 1060, at: F_CALC, ph: 4.5, labelOp: otherLabelOp },
  ];

  const particles = Array.from({ length: 18 }, (_, i) => ({
    bx: random(`px${i}`) * 1080,
    by: 300 + random(`py${i}`) * 900,
    s: 6 + random(`ps${i}`) * 14,
    ph: random(`ph${i}`) * 6.28,
    o: 0.12 + random(`po${i}`) * 0.18,
  }));

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* soft cyan water tint */}
      <AbsoluteFill
        style={{
          opacity: waterOp,
          background: `radial-gradient(900px 700px at 50% 42%, rgba(34,211,238,0.22), transparent 70%), radial-gradient(700px 600px at 20% 75%, rgba(34,211,238,0.12), transparent 70%), radial-gradient(700px 600px at 82% 70%, rgba(34,211,238,0.10), transparent 70%)`,
        }}
      />
      {/* faint drifting particles */}
      <AbsoluteFill style={{ opacity: waterOp }}>
        {particles.map((p, i) => {
          const px = p.bx + Math.sin(frame / 60 + p.ph) * 30;
          const py = p.by + Math.cos(frame / 70 + p.ph) * 30;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: p.s,
                height: p.s,
                borderRadius: p.s / 2,
                background: theme.accent,
                opacity: p.o,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* intro headline, fades before dots */}
      <Appear at={0} outAt={sec(2.8)} style={{ position: "absolute", top: 260, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg, letterSpacing: -2 }}>
          Tap water tastes off
        </div>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 52, color: theme.accent, marginTop: 12 }}>
          WHAT IS FLOATING IN IT?
        </div>
      </Appear>

      {/* mineral dots */}
      {dots.map((d) => {
        if (frame < d.at) return null;
        const pop = spring({ frame: frame - d.at, fps, config: { damping: 14 } });
        const s = Math.max(0.01, pop);
        const op = interpolate(frame, [d.at, d.at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * dotsOut;
        const bobY = Math.sin((frame + d.ph * 30) / 22) * 14;
        const bobX = Math.cos((frame + d.ph * 30) / 28) * 18;
        const fx = d.x + bobX;
        const fy = d.yBase + bobY + fall;
        return (
          <div key={d.key} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: op, pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                left: fx - 62,
                top: fy - 62,
                width: 124,
                height: 124,
                borderRadius: 62,
                background: d.color,
                transform: `scale(${s})`,
                boxShadow: `0 0 44px ${d.color}`,
                border: "6px solid rgba(255,255,255,0.85)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: fx - 200,
                top: fy + 78,
                width: 400,
                textAlign: "center",
                opacity: d.labelOp,
                background: "rgba(8,20,32,0.72)",
                borderRadius: 18,
                paddingTop: 10,
                paddingBottom: 12,
              }}
            >
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.fg, letterSpacing: 1 }}>{d.label}</div>
            </div>
          </div>
        );
      })}

      {/* grey sieve mesh swinging in from right */}
      {frame >= F_MESH && meshOp > 0.01 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: meshOp, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: 160 + meshSlide + shakeX,
              top: 640 + shakeY,
              width: 760,
              height: 500,
              borderRadius: 28,
              border: "10px solid #AEB8C6",
              backgroundColor: "rgba(148,160,176,0.20)",
              backgroundImage: `linear-gradient(rgba(174,184,198,0.95) 3px, transparent 3px), linear-gradient(90deg, rgba(174,184,198,0.95) 3px, transparent 3px)`,
              backgroundSize: "46px 46px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 160 + meshSlide + shakeX,
              top: 586 + shakeY,
              width: 760,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: theme.font,
                fontWeight: 900,
                fontSize: 48,
                color: theme.fg,
                background: "rgba(8,20,32,0.8)",
                borderRadius: 16,
                paddingLeft: 26,
                paddingRight: 26,
                paddingTop: 8,
                paddingBottom: 10,
              }}
            >
              SIEVE MESH
            </span>
          </div>
          {/* red X */}
          <div style={{ position: "absolute", left: 540 + meshSlide + shakeX, top: 890 + shakeY, width: 0, height: 0, opacity: xOp }}>
            <div style={{ position: "absolute", left: -190, top: -22, width: 380, height: 44, borderRadius: 22, background: "#FF3B30", transform: "rotate(24deg)" }} />
            <div style={{ position: "absolute", left: -190, top: -22, width: 380, height: 44, borderRadius: 22, background: "#FF3B30", transform: "rotate(-24deg)" }} />
          </div>
        </div>
      )}

      {/* end chemistry glow + text */}
      <Appear at={F_CHEM} style={{ position: "absolute", top: 660, width: "100%", alignItems: "center" }}>
        <div style={{ position: "relative", width: "100%", alignItems: "center", transform: `scale(${chemScale})` }}>
          <div
            style={{
              position: "absolute",
              left: 190,
              top: -90,
              width: 700,
              height: 560,
              borderRadius: 350,
              background: "radial-gradient(circle, rgba(34,211,238,0.42), rgba(34,211,238,0.08) 60%, transparent 72%)",
              opacity: glowPulse,
            }}
          />
          <div style={{ position: "relative", textAlign: "center", paddingLeft: 60, paddingRight: 60 }}>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 104, color: theme.accent, letterSpacing: -1 }}>CHEMISTRY</div>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 76, color: theme.fg, marginTop: 6 }}>NOT A SIEVE</div>
            <div style={{ height: 30 }} />
            <div
              style={{
                display: "inline-block",
                fontFamily: theme.font,
                fontWeight: 800,
                fontSize: 50,
                color: theme.fg,
                background: "rgba(8,20,32,0.75)",
                border: `3px solid ${theme.accent}`,
                borderRadius: 24,
                paddingLeft: 30,
                paddingRight: 30,
                paddingTop: 10,
                paddingBottom: 12,
              }}
            >
              DISSOLVED NEEDS
            </div>
            <div style={{ height: 28 }} />
            <div style={{ fontSize: 120, lineHeight: 1 }}>{"\u{1F9EA}"}</div>
          </div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
}