import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, sec, ramp, useSpringAt, Appear } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  const sCards = useSpringAt(sec(3.54), 14);
  const sHits = useSpringAt(sec(4.3), 14);
  const sStop = useSpringAt(sec(7.02), 14);

  const F_READ = sec(1.04);
  const F_WRITE = sec(2.28);
  const F_PROFILE = sec(3.54);
  const F_HITS = sec(4.3);
  const F_MELTS = sec(5.78);
  const F_STOP = sec(7.02);
  const F_READING = sec(7.28);

  const readCount = Math.round(
    interpolate(frame, [F_READ, F_READ + 30], [0, 99], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const ratioP = ramp(frame, F_WRITE, 20);
  const heat = ramp(frame, F_MELTS, 14);
  const dim = ramp(frame, F_READING, 14);
  const stopIn = ramp(frame, F_STOP, 8);
  const flowP = ramp(frame, F_READING, 22);

  const thud = interpolate(frame, [F_HITS, F_HITS + 6, F_HITS + 18], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeEnv =
    ramp(frame, F_MELTS, 10) * (1 - ramp(frame, F_STOP, 12));
  const shakeX = Math.sin(frame * 0.9) * 14 * shakeEnv;
  const squashY = 1 - 0.18 * thud;
  const thudY = 22 * thud;

  const dbBg = dim > 0.5 ? theme.muted : heat > 0.5 ? "#ff4444" : theme.fg;
  const dbGlow =
    heat * (1 - dim) > 0.1
      ? `0 0 ${Math.round(30 + 40 * heat)}px ${theme.accent2}, 0 0 90px rgba(255,60,120,0.55)`
      : "0 18px 50px rgba(0,0,0,0.6)";

  const pulse = 0.55 + 0.45 * Math.sin(frame * 0.25);

  const gridIcons = Array.from({ length: 99 });
  const smokes = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* TOP HEADLINES — own band 192-420 */}
      <Appear
        at={F_READ}
        outAt={sec(3.2)}
        style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 92,
            color: theme.fg,
            letterSpacing: -2,
          }}
        >
          READ WAY MORE
        </div>
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 52,
            color: theme.accent,
            marginTop: 8,
          }}
        >
          THAN YOU WRITE
        </div>
      </Appear>

      <Appear
        at={F_PROFILE}
        outAt={sec(5.6)}
        style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 88,
            color: theme.fg,
          }}
        >
          EVERY VIEW HITS DB
        </div>
      </Appear>

      <Appear
        at={F_MELTS}
        outAt={sec(6.6)}
        style={{ position: "absolute", top: 240, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 104,
            color: theme.accent2,
          }}
        >
          IT MELTS.
        </div>
      </Appear>

      <Appear
        at={F_STOP}
        style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 84,
            color: theme.fg,
          }}
        >
          STOP READING FROM IT
        </div>
      </Appear>

      {/* COMPARISON GROUP: 99 reads left vs 1 write right */}
      <Appear at={F_READ} outAt={sec(3.2)} dy={0} style={{ position: "absolute", top: 0, width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", left: 70, top: 500, width: 420 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: 400 }}>
            {gridIcons.map((_, i) => {
              const delay = F_READ + (i % 11) * 1.5 + Math.floor(i / 11) * 1.2;
              const s = interpolate(frame, [delay, delay + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: theme.fg,
                    transform: `scale(${s})`,
                    opacity: s,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 10,
                      borderRadius: 8,
                      border: `3px solid #0a0a0a`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: 3, background: "#0a0a0a" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: theme.font,
              fontWeight: 900,
              fontSize: 56,
              color: theme.accent,
              letterSpacing: 2,
            }}
          >
            READS
          </div>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 84, color: theme.fg }}>
            {readCount}
          </div>
        </div>

        <div style={{ position: "absolute", right: 70, top: 560, width: 320, textAlign: "center" }}>
          <div
            style={{
              opacity: ramp(frame, F_WRITE, 10),
              transform: `scale(${interpolate(frame, [F_WRITE, F_WRITE + 12], [0.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })})`,
            }}
          >
            <div
              style={{
                width: 150,
                height: 150,
                borderRadius: 36,
                background: theme.accent3,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 40px rgba(255,220,40,0.5)",
              }}
            >
              <div style={{ fontSize: 86, fontWeight: 900, color: "#111", transform: "rotate(-18deg)" }}>
                ✎
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: theme.font,
                fontWeight: 900,
                fontSize: 56,
                color: theme.accent3,
              }}
            >
              WRITE
            </div>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 84, color: theme.fg }}>
              1
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", left: 80, top: 1150, width: 920, opacity: ratioP }}>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: theme.fg, textAlign: "center" }}>
            99 : 1
          </div>
          <div
            style={{
              marginTop: 12,
              height: 38,
              borderRadius: 19,
              background: "#1c1c22",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div style={{ width: `${99 * ratioP}%`, background: theme.accent }} />
            <div style={{ width: `${Math.max(2, 1 * ratioP * 8)}%`, background: theme.accent3 }} />
          </div>
        </div>
      </Appear>

      {/* PROFILE CARDS + straight arrows */}
      <Appear at={F_PROFILE} outAt={sec(6.6)} dy={60} style={{ position: "absolute", top: 0, width: "100%", height: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 480,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 24,
            transform: `translateY(${(1 - sCards) * 80}px)`,
            opacity: sCards,
          }}
        >
          {["USER 1", "USER 2", "USER 3"].map((t, i) => (
            <div
              key={t}
              style={{
                width: 290,
                height: 150,
                borderRadius: 28,
                background: theme.fg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
                transform: `translateY(${Math.sin(frame * 0.12 + i) * 6}px)`,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 900,
                  color: theme.fg,
                  fontFamily: theme.font,
                }}
              >
                ◉
              </div>
              <div style={{ marginTop: 8, fontFamily: theme.font, fontWeight: 900, fontSize: 36, color: "#111" }}>
                {t}
              </div>
            </div>
          ))}
        </div>
        <svg
          style={{ position: "absolute", top: 640, left: 0, width: 1080, height: 420 }}
          viewBox="0 0 1080 420"
        >
          {[
            { x1: 240, x2: 470 },
            { x1: 540, x2: 540 },
            { x1: 840, x2: 610 },
          ].map((a, i) => {
            const slamY = interpolate(frame, [F_HITS, F_HITS + 8], [0, 60], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const y2 = 330 + slamY;
            return (
              <g key={i}>
                <line
                  x1={a.x1}
                  y1={60}
                  x2={a.x2}
                  y2={y2}
                  stroke={theme.accent}
                  strokeWidth={14}
                  strokeLinecap="round"
                  opacity={0.55 + 0.45 * pulse}
                />
                <polygon
                  points={`${a.x2},${y2 + 28} ${a.x2 - 20},${y2 - 6} ${a.x2 + 20},${y2 - 6}`}
                  fill={theme.accent}
                  opacity={0.7 + 0.3 * pulse}
                />
              </g>
            );
          })}
        </svg>
      </Appear>

      {/* MAIN DATABASE CYLINDER — persistent from profile on */}
      <div
        style={{
          position: "absolute",
          top: 1000,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: ramp(frame, F_PROFILE, 12),
          transform: `translateX(${shakeX}px) translateY(${thudY}px) scale(${0.7 + 0.3 * sCards})`,
        }}
      >
        <div
          style={{
            width: 420,
            height: 84,
            borderRadius: "50%",
            background: dbBg,
            border: `10px solid ${dim > 0.5 ? "#3a3a42" : heat > 0.5 ? theme.accent2 : "#d6d6de"}`,
            zIndex: 2,
            transform: `scaleY(${squashY})`,
            boxShadow: dbGlow,
            opacity: 1 - dim * 0.35,
          }}
        >
          <div
            style={{
              width: 300,
              height: 44,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.14)",
              margin: "10px auto 0 auto",
            }}
          />
        </div>
        <div
          style={{
            width: 420,
            height: 190,
            marginTop: -42,
            background: dbBg,
            borderLeft: `10px solid ${dim > 0.5 ? "#3a3a42" : heat > 0.5 ? theme.accent2 : "#d6d6de"}`,
            borderRight: `10px solid ${dim > 0.5 ? "#3a3a42" : heat > 0.5 ? theme.accent2 : "#d6d6de"}`,
            borderBottom: `10px solid ${dim > 0.5 ? "#3a3a42" : heat > 0.5 ? theme.accent2 : "#d6d6de"}`,
            borderBottomLeftRadius: 60,
            borderBottomRightRadius: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scaleY(${squashY})`,
            transformOrigin: "top center",
            boxShadow: dbGlow,
            opacity: 1 - dim * 0.35,
          }}
        >
          <div
            style={{
              fontFamily: theme.font,
              fontWeight: 900,
              fontSize: 48,
              color: "#55555e",
              letterSpacing: 1,
              paddingTop: 30,
            }}
          >
            MAIN DATABASE
          </div>
        </div>
        {/* melt drips */}
        <div style={{ display: "flex", gap: 26, marginTop: -6, opacity: heat * (1 - dim * 0.4) }}>
          {[0, 1, 2].map((i) => {
            const h = interpolate(frame, [F_MELTS + i * 6, F_MELTS + 30 + i * 6], [0, 60 + i * 18], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{ width: 26, height: Math.max(0, h), background: "#ff5555", borderRadius: 13 }} />
            );
          })}
        </div>
        {/* smoke */}
        <div style={{ position: "absolute", top: -110, width: 420, height: 120, pointerEvents: "none" }}>
          {smokes.map((i) => {
            const rise = interpolate(frame, [F_MELTS + i * 8, F_MELTS + 50 + i * 8], [0, -90], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const o = interpolate(frame, [F_MELTS + i * 8, F_MELTS + 20 + i * 8, F_MELTS + 55 + i * 8], [0, 0.85, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 90 + i * 70,
                  top: 70 + (i % 2) * 18,
                  width: 62 - i * 6,
                  height: 62 - i * 6,
                  borderRadius: "50%",
                  background: "#9a9aa3",
                  opacity: o * (1 - dim * 0.5),
                  transform: `translateY(${rise}px) scale(${1 + -rise / 90})`,
                }}
              />
            );
          })}
        </div>
        {/* heat shimmer ring */}
        <div
          style={{
            position: "absolute",
            top: -20,
            width: 480,
            height: 320,
            borderRadius: 40,
            border: `8px solid ${theme.accent2}`,
            opacity: heat * (1 - dim) * (0.35 + 0.25 * pulse),
          }}
        />
      </div>

      {/* STOP BAR + U-TURN + reroute flow */}
      <div style={{ position: "absolute", top: 770, width: "100%", display: "flex", justifyContent: "center", opacity: stopIn }}>
        <div
          style={{
            width: 880,
            height: 148,
            background: theme.fg,
            borderRadius: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.4 + 0.6 * sStop}) rotate(-4deg)`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 100, color: "#0b0b0e", letterSpacing: 6 }}>
            STOP
          </div>
        </div>
      </div>

      <svg
        style={{ position: "absolute", top: 620, left: 0, width: 1080, height: 420, opacity: stopIn }}
        viewBox="0 0 1080 420"
      >
        {[
          { y: 80, c: "M 200 80 C 360 80 360 220 520 220" },
          { y: 160, c: "M 200 160 C 380 160 380 280 540 280" },
        ].map((p, i) => (
          <g key={i}>
            <path d={p.c} fill="none" stroke={theme.accent3} strokeWidth={13} strokeLinecap="round" opacity={0.95} />
            <polygon points="180,80 214,62 214,98" fill={theme.accent3} transform={`translate(-6,${p.y - 80})`} />
          </g>
        ))}
        <text x={680} y={220} fill={theme.accent} fontSize={44} fontWeight={900} fontFamily={theme.font}>
          AWAY
        </text>
      </svg>

      <svg
        style={{ position: "absolute", top: 920, left: 0, width: 1080, height: 260, opacity: flowP }}
        viewBox="0 0 1080 260"
      >
        <line x1={80} y1={130} x2={80 + 860 * flowP} y2={130} stroke={theme.accent} strokeWidth={28} strokeLinecap="round" />
        <line x1={120} y1={130} x2={120 + 700 * flowP} y2={130} stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeDasharray="26 30" opacity={0.9} />
        {flowP > 0.85 ? (
          <polygon points="950,130 906,102 906,158" fill={theme.accent} />
        ) : null}
      </svg>
      <div style={{ position: "absolute", top: 1090, width: "100%", textAlign: "center", opacity: flowP }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: theme.accent }}>
          READ FROM CACHE
        </div>
      </div>
    </AbsoluteFill>
  );
}