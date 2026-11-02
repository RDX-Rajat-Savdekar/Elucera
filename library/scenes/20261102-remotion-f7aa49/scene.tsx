import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, sec, Appear, Title, useSpringAt } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  const sCard = useSpringAt(sec(2.04), 14);
  const sZoom = useSpringAt(sec(5.02), 14);
  const sPuff = useSpringAt(sec(21.14), 14);
  const sScale = useSpringAt(sec(25.26), 14);

  const DOT_N = 44;
  const dots = Array.from({ length: DOT_N }, (_, i) => {
    const bx = 90 + random(`dx-${i}`) * 900;
    const by = 430 + random(`dy-${i}`) * 140;
    const jx = Math.sin(frame / 18 + i * 1.7) * 10;
    const jy = Math.cos(frame / 24 + i * 1.3) * 10;
    return { x: bx + jx, y: by + jy };
  });

  // single request dot down to cache then bounce
  const travelY = interpolate(frame, [sec(3.94), sec(5.02), sec(6.36)], [500, 740, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travelOp = interpolate(frame, [sec(3.94), sec(4.1), sec(7.6), sec(8.06)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // miss line packet replica -> cache
  const upY = interpolate(frame, [sec(8.06), sec(11.02)], [1090, 760], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const upOp = interpolate(frame, [sec(8.06), sec(8.3), sec(10.6), sec(11.02)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const downLineOp = interpolate(frame, [sec(8.06), sec(8.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // cache card slide into cache
  const cardTop = interpolate(frame, [sec(2.04), sec(11.02), sec(12.0)], [560, 560, 740], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardOp = interpolate(frame, [sec(2.04), sec(2.3), sec(11.6), sec(12.2)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardScale = 0.6 + sCard * 0.4;

  const shakeX = frame >= sec(5.02) && frame < sec(6.36) ? Math.sin(frame * 0.9) * 14 : 0;

  const cacheGlow = interpolate(frame, [sec(3.94), sec(4.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isGreen = frame >= sec(11.02) && frame < sec(21.14);
  const isGreen2 = frame >= sec(23.74);
  const isGreenNow = isGreen || isGreen2;
  const isEmptyDeleted = frame >= sec(21.14) && frame < sec(23.74);
  void isEmptyDeleted;

  const fillOp = isGreenNow
    ? 1
    : interpolate(frame, [sec(11.02), sec(11.8)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  void fillOp;

  const timerVal = Math.max(1, 60 - Math.floor((frame - sec(11.02)) / 10));

  // delete arrow
  const arrowY = interpolate(frame, [sec(21.14), sec(21.8)], [360, 680], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowOp = interpolate(frame, [sec(21.14), sec(21.3), sec(21.8), sec(22.1)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const puffScale = 0.3 + sPuff * 1.6;
  const puffOp = interpolate(frame, [sec(21.8), sec(23.0)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // reload dot through cache to replica
  const reloadY = interpolate(frame, [sec(23.74), sec(25.0)], [500, 1090], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reloadOp = interpolate(frame, [sec(23.74), sec(23.9), sec(24.8), sec(25.26)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // scale spread 0->1
  const spread = interpolate(frame, [sec(25.26), sec(26.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const singleCacheOp = interpolate(frame, [sec(25.26), sec(25.6)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tripleOp = interpolate(frame, [sec(25.26), sec(25.6)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hitPulse = frame % 12 < 6 ? 1 : 0.25;

  const floodVisible = frame >= sec(15.96) && frame < sec(21.14);
  const FLOOD_N = 56;

  const replicaLit = frame >= sec(8.06) && frame < sec(11.02) ? 1 : frame >= sec(23.74) && frame < sec(25.26) ? 1 : 0.25;

  const cacheBorder: string = (() => {
    if (frame >= sec(21.14) && frame < sec(23.74)) return theme.muted;
    if (isGreenNow) return theme.good;
    if (frame >= sec(3.94) && frame < sec(11.02)) return theme.accent;
    return theme.muted;
  })();

  const zoomScale = 1 + sZoom * 0.12;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Title text="1000 want user 42" at={0} y={210} size={88} color={theme.fg} />

      {/* swarm base dots */}
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: i === 5 ? theme.accent3 : theme.fg,
            opacity: 0.9,
          }}
        />
      ))}

      {/* travelling single dot */}
      <div
        style={{
          position: "absolute",
          left: 532,
          top: travelY,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: theme.accent3,
          boxShadow: `0 0 24px ${theme.accent3}`,
          opacity: travelOp,
        }}
      />
      {/* vertical request line */}
      <div
        style={{
          position: "absolute",
          left: 544,
          top: 560,
          width: 4,
          height: 160,
          background: theme.accent,
          opacity: interpolate(frame, [sec(3.94), sec(4.2)], [0, 0.9], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* profile card */}
      <div
        style={{
          position: "absolute",
          left: 340,
          top: cardTop,
          width: 400,
          height: 150,
          borderRadius: 28,
          background: "#141414",
          border: `4px solid ${theme.fg}`,
          boxShadow: `0 0 40px rgba(255,255,255,0.25)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          opacity: cardOp,
          transform: `scale(${cardScale})`,
        }}
      >
        <div style={{ width: 84, height: 84, borderRadius: 42, background: theme.fg }} />
        <div style={{ color: theme.fg, fontFamily: theme.font, fontWeight: 900, fontSize: 62 }}>user 42</div>
      </div>

      {/* CACHE single box */}
      <div
        style={{
          position: "absolute",
          left: 160 + shakeX,
          top: 700,
          width: 760,
          height: 210,
          borderRadius: 36,
          border: `7px solid ${cacheBorder}`,
          background: isGreenNow ? "rgba(0,200,120,0.22)" : "transparent",
          boxShadow: cacheGlow > 0 && !isGreenNow ? `0 0 60px ${theme.accent}` : isGreenNow ? `0 0 70px ${theme.good}` : "none",
          opacity: singleCacheOp,
          transform: `scale(${zoomScale})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: frame >= sec(3.94) ? theme.accent : theme.muted,
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: frame >= sec(5.02) ? 72 + sZoom * 10 : 64,
            letterSpacing: 2,
          }}
        >
          REDIS CACHE
        </div>
      </div>

      {/* miss line cache -> replica */}
      <div
        style={{
          position: "absolute",
          left: 352,
          top: 910,
          width: 5,
          height: 170,
          background: theme.accent,
          opacity: frame >= sec(8.06) && frame < sec(11.02) ? downLineOp : frame >= sec(23.74) && frame < sec(25.26) ? 0.9 : 0,
        }}
      />
      {/* packet up replica -> cache */}
      <div
        style={{
          position: "absolute",
          left: 340,
          top: upY,
          width: 60,
          height: 36,
          borderRadius: 10,
          background: theme.accent,
          opacity: upOp,
        }}
      />
      {/* reload dot */}
      <div
        style={{
          position: "absolute",
          left: 532,
          top: reloadY,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: theme.fg,
          boxShadow: `0 0 20px ${theme.fg}`,
          opacity: reloadOp,
        }}
      />

      {/* replica + main db */}
      <div style={{ position: "absolute", left: 90, top: 1080, width: 420, height: 150 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 28,
            border: `6px solid ${replicaLit > 0.5 ? theme.accent : theme.muted}`,
            background: replicaLit > 0.5 ? "rgba(0,220,255,0.15)" : "transparent",
            boxShadow: replicaLit > 0.5 ? `0 0 44px ${theme.accent}` : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -26,
            width: "100%",
            height: 52,
            borderRadius: "50%",
            border: `6px solid ${replicaLit > 0.5 ? theme.accent : theme.muted}`,
            background: theme.bg,
          }}
        />
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            color: replicaLit > 0.5 ? theme.accent : theme.muted,
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 48,
          }}
        >
          READ REPLICA
        </div>
      </div>

      <div style={{ position: "absolute", left: 570, top: 1080, width: 420, height: 150 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 28, border: `6px solid ${theme.muted}`, opacity: 0.5 }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -26,
            width: "100%",
            height: 52,
            borderRadius: "50%",
            border: `6px solid ${theme.muted}`,
            background: theme.bg,
            opacity: 0.5,
          }}
        />
        {/* X */}
        <div style={{ position: "absolute", left: 30, top: 10, width: 360, height: 12, background: theme.muted, transform: "rotate(18deg)", opacity: 0.9 }} />
        <div style={{ position: "absolute", left: 30, top: 10, width: 360, height: 12, background: theme.muted, transform: "rotate(-18deg)", opacity: 0.9 }} />
        <div style={{ marginTop: 18, textAlign: "center", color: theme.muted, fontFamily: theme.font, fontWeight: 900, fontSize: 48 }}>
          MAIN DB
        </div>
      </div>

      {/* flood dots HIT phase */}
      {floodVisible &&
        Array.from({ length: FLOOD_N }, (_, k) => {
          const prog = ((frame - sec(15.96) + k * 11) % 48) / 48;
          const yy = 500 + Math.sin(prog * Math.PI) * 220;
          const xx = 90 + random(`fx-${k}`) * 900;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: xx,
                top: yy,
                width: 14,
                height: 14,
                borderRadius: 7,
                background: theme.fg,
                opacity: 0.95,
              }}
            />
          );
        })}

      {/* magenta delete arrow striking right edge */}
      <div style={{ position: "absolute", left: 800, top: arrowY, opacity: arrowOp, textAlign: "center" }}>
        <div style={{ width: 18, height: 110, background: theme.accent2, margin: "0 auto", boxShadow: `0 0 30px ${theme.accent2}` }} />
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "36px solid transparent",
            borderRight: "36px solid transparent",
            borderTop: `52px solid ${theme.accent2}`,
            margin: "0 auto",
          }}
        />
      </div>
      {/* deleted puff */}
      {frame >= sec(21.14) && (
        <div
          style={{
            position: "absolute",
            left: 700,
            top: 710,
            width: 220,
            height: 220,
            borderRadius: 110,
            border: `8px solid ${theme.muted}`,
            opacity: puffOp,
            transform: `scale(${puffScale})`,
          }}
        />
      )}

      {/* triple scale boxes */}
      <div style={{ position: "absolute", left: 0, top: 700, width: 1080, height: 220, opacity: tripleOp }}>
        {[-1, 0, 1].map((o) => (
          <div
            key={o}
            style={{
              position: "absolute",
              left: 390 + o * 320 * spread,
              top: 0,
              width: 300,
              height: 200,
              borderRadius: 32,
              border: `7px solid ${theme.good}`,
              background: "rgba(0,200,120,0.22)",
              boxShadow: `0 0 50px ${theme.good}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${0.6 + sScale * 0.4})`,
            }}
          >
            <div style={{ color: theme.good, fontFamily: theme.font, fontWeight: 900, fontSize: 40 }}>CACHE</div>
          </div>
        ))}
      </div>

      {/* FOCAL STATUS BAND y 940-1060 one at a time */}
      <Appear at={sec(6.36)} outAt={sec(8.0)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
          <div style={{ color: theme.muted, fontFamily: theme.font, fontWeight: 900, fontSize: 68 }}>EMPTY</div>
          <div style={{ background: theme.accent2, color: "#fff", fontFamily: theme.font, fontWeight: 900, fontSize: 56, padding: "8px 28px", borderRadius: 18 }}>
            MISS
          </div>
        </div>
      </Appear>

      <Appear at={sec(8.06)} outAt={sec(10.9)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.accent, fontFamily: theme.font, fontWeight: 900, fontSize: 64 }}>reads replica</div>
      </Appear>

      <Appear at={sec(11.02)} outAt={sec(15.8)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
          <div style={{ color: theme.good, fontFamily: theme.font, fontWeight: 900, fontSize: 72 }}>FULL</div>
          <div style={{ color: theme.accent3, fontFamily: theme.font, fontWeight: 900, fontSize: 68 }}>{timerVal}s</div>
        </div>
      </Appear>

      <Appear at={sec(15.96)} outAt={sec(21.0)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.good, fontFamily: theme.font, fontWeight: 900, fontSize: 84, opacity: hitPulse }}>HIT • HIT • HIT</div>
      </Appear>

      <Appear at={sec(21.14)} outAt={sec(23.6)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.muted, fontFamily: theme.font, fontWeight: 900, fontSize: 76 }}>DELETED</div>
      </Appear>

      <Appear at={sec(23.74)} outAt={sec(25.1)} style={{ position: "absolute", top: 940, width: "100%", textAlign: "center" }}>
        <div style={{ color: theme.good, fontFamily: theme.font, fontWeight: 900, fontSize: 78 }}>FRESH</div>
      </Appear>

      <Appear at={sec(25.26)} style={{ position: "absolute", top: 930, width: "100%", textAlign: "center" }}>
        <div>
          <div style={{ color: theme.good, fontFamily: theme.font, fontWeight: 900, fontSize: 80 }}>SCALE OUT</div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
            <div style={{ color: theme.accent3, fontFamily: theme.font, fontWeight: 800, fontSize: 52 }}>writes stay safe</div>
            <div style={{ fontSize: 52 }}>🔒</div>
          </div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
}