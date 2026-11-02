import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, random } from "remotion";
import { theme, sec, Appear } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const b204 = sec(2.04);
  const b394 = sec(3.94);
  const b502 = sec(5.02);
  const b636 = sec(6.36);
  const b806 = sec(8.06);
  const b1102 = sec(11.02);
  const b1596 = sec(15.96);
  const b2114 = sec(21.14);
  const b2374 = sec(23.74);
  const b2526 = sec(25.26);

  const pop42 = spring({ frame: Math.max(0, frame - b204), fps, config: { damping: 14 } });
  const pop42Clamped = interpolate(pop42, [0, 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const travel1 = interpolate(frame, [b394, b502], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bounceP = interpolate(frame, [b636, b806], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const upPacket = interpolate(frame, [b806, b1102], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fillP = interpolate(frame, [b1102, sec(12.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floodP = interpolate(frame, [b1596, sec(17.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const strikeP = interpolate(frame, [b2114, sec(21.7)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reloadP = interpolate(frame, [b2374, sec(24.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scaleP = interpolate(frame, [b2526, sec(26.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const isFullGreen = (frame >= b1102 && frame < b2114) || frame >= b2374;
  const isDeletedGap = frame >= b2114 && frame < b2374;
  const isScaled = frame >= b2526;

  const shakeX =
    frame >= b502 && frame < b636 ? Math.sin(frame * 1.1) * 14 * interpolate(frame, [b502, b636], [1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const cacheGlow = interpolate(frame, [b394, b502], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const replicaOn = (frame >= b806 && frame < b1596) || frame >= b2374;
  const replicaGlow = replicaOn ? 1 : 0;

  const secsLeftRaw = 60 - (frame - b1102) / 30;
  const secsLeft = Math.max(47, Math.min(60, Math.round(secsLeftRaw)));

  const swarm = Array.from({ length: 22 }, (_, i) => ({
    x: 90 + random(`swx${i}`) * 900,
    y: 478 + random(`swy${i}`) * 110,
    s: 16 + random(`sws${i}`) * 16,
    ph: random(`swp${i}`) * 6,
  }));

  const flood = Array.from({ length: 34 }, (_, i) => ({
    x: 80 + random(`flx${i}`) * 920,
    y0: 480 + random(`fly${i}`) * 80,
    s: 14 + random(`fls${i}`) * 16,
    d: random(`fld${i}`),
  }));

  const boom = Array.from({ length: 9 }, (_, i) => ({
    a: (i / 9) * Math.PI * 2 + random(`bma${i}`) * 0.5,
    dist: 60 + random(`bmd${i}`) * 130,
    s: 12 + random(`bms${i}`) * 18,
  }));

  const dotY1 = 540 + travel1 * (770 - 540);
  const bounceY = 770 + Math.sin(bounceP * Math.PI) * -140 - bounceP * 60;
  const showFirstDot = frame >= b394 && frame < b806;
  const firstDotY = frame < b636 ? dotY1 : bounceY;
  const firstDotOp = showFirstDot ? 1 : 0;

  const packetY = 1100 - upPacket * (1100 - 780);
  const reloadY = 540 + reloadP * (1100 - 540);
  const reloadThrough = reloadP > 0.45 ? 1 : 0;

  const strikeY = 480 + strikeP * (770 - 480);

  const floatY = Math.sin(frame / 18) * 8;

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* subtle grid */}
      <AbsoluteFill style={{ opacity: 0.14 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 380 + i * 85, height: 2, background: theme.muted, opacity: 0.35 }} />
        ))}
      </AbsoluteFill>

      {/* HEADLINES — one at a time, faded out before next */}
      <Appear at={0} outAt={b394 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>1000 want user 42</div>
      </Appear>
      <Appear at={b394} outAt={b636 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          First checks <span style={{ color: theme.accent }}>REDIS</span>
        </div>
      </Appear>
      <Appear at={b636} outAt={b1102 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          Empty? Read replica
        </div>
      </Appear>
      <Appear at={b1102} outAt={b1596 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          Save for <span style={{ color: theme.accent3 }}>60s</span>
        </div>
      </Appear>
      <Appear at={b1596} outAt={b2114 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          999 hits, no DB
        </div>
      </Appear>
      <Appear at={b2114} outAt={b2374 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          Update? <span style={{ color: theme.accent2 }}>Delete key</span>
        </div>
      </Appear>
      <Appear at={b2374} outAt={b2526 - 8} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          Next reloads fresh
        </div>
      </Appear>
      <Appear at={b2526} style={{ position: "absolute", top: 208, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg }}>
          Reads <span style={{ color: theme.good }}>scale out</span>
        </div>
      </Appear>

      {/* sub label under headline */}
      <Appear at={0} outAt={b502 - 6} style={{ position: "absolute", top: 318, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 50, color: theme.muted }}>1000 users want user 42</div>
      </Appear>

      {/* USER SWARM */}
      <div style={{ position: "absolute", top: 440, left: 0, width: 1080, height: 170, opacity: interpolate(frame, [0, sec(0.8)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {swarm.map((d, i) => {
          const bob = Math.sin(frame / 16 + d.ph) * 10;
          const isHero = i === 5;
          const dim = frame >= b1596 && frame < b2114 && !isHero ? 0.95 : 1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: d.x,
                top: d.y - 440 + bob + floatY * 0.4,
                width: isHero && frame >= b394 ? d.s + 10 : d.s,
                height: isHero && frame >= b394 ? d.s + 10 : d.s,
                borderRadius: "50%",
                background: isHero && frame >= b394 ? theme.accent3 : theme.fg,
                opacity: dim,
                boxShadow: isHero && frame >= b394 ? `0 0 24px ${theme.accent3}` : "none",
                transform: `translate(-50%,-50%)`,
              }}
            />
          );
        })}
      </div>

      {/* PROFILE CARD user 42 — sits in its own band below swarm, never over dots */}
      {frame >= b204 && frame < b1102 && (
        <div style={{ position: "absolute", top: 610, width: "100%", display: "flex", justifyContent: "center", opacity: pop42Clamped }}>
          <div
            style={{
              transform: `scale(${pop42Clamped})`,
              background: "#FFFFFF",
              color: "#0B0E14",
              borderRadius: 28,
              padding: "18px 42px",
              fontFamily: theme.font,
              fontWeight: 900,
              fontSize: 62,
              boxShadow: `0 0 50px rgba(255,255,255,0.55)`,
            }}
          >
            user 42
          </div>
        </div>
      )}

      {/* vertical request line users -> cache */}
      {frame >= b394 && frame < b1596 && (
        <div style={{ position: "absolute", left: 537, top: 560, width: 6, height: 200, background: frame >= b636 ? theme.muted : theme.accent, opacity: 0.9, borderRadius: 3 }} />
      )}
      {/* traveling hero dot */}
      {showFirstDot && (
        <div style={{ position: "absolute", left: 540, top: firstDotY, width: 34, height: 34, borderRadius: "50%", background: theme.accent3, boxShadow: `0 0 26px ${theme.accent3}`, opacity: firstDotOp, transform: "translate(-50%,-50%)" }} />
      )}

      {/* CACHE BOX — single (hidden when scaled to 3) */}
      {!isScaled && (
        <div style={{ position: "absolute", top: 748, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", transform: `translateX(${shakeX}px)` }}>
          <div
            style={{
              width: 640,
              height: 210,
              borderRadius: 32,
              border: `8px solid ${isFullGreen ? theme.good : frame >= b394 ? theme.accent : theme.muted}`,
              background: isFullGreen ? `rgba(0,200,120,${0.22 + fillP * 0.55})` : "rgba(255,255,255,0.03)",
              boxShadow: isFullGreen ? `0 0 70px ${theme.good}` : cacheGlow > 0.05 ? `0 0 60px ${theme.accent}` : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isFullGreen && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${fillP * 100}%`, background: theme.good, opacity: 0.32 }} />
            )}
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: frame >= b502 && frame < b636 ? 72 : 58, color: isFullGreen ? theme.good : theme.accent, letterSpacing: 2, zIndex: 1 }}>
              REDIS CACHE
            </div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 52, color: isFullGreen ? "#FFFFFF" : theme.muted, marginTop: 8, zIndex: 1 }}>
              {isFullGreen ? (frame >= b2374 ? "FRESH" : "FULL") : isDeletedGap ? "EMPTY" : frame >= b636 ? "EMPTY" : frame >= b502 ? "???" : "READY"}
            </div>
          </div>
          {/* MISS badge — BESIDE box, not over text */}
          {frame >= b636 && frame < b1102 && (
            <div style={{ marginTop: 14, display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ fontFamily: theme.mono, fontWeight: 900, fontSize: 48, color: "#FFFFFF", background: "#E5484D", borderRadius: 18, padding: "8px 28px" }}>MISS</div>
              <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 48, color: theme.muted }}>dot bounces off</div>
            </div>
          )}
          {/* timer — BELOW box with padding */}
          {frame >= b1102 && frame < b2114 && (
            <div style={{ marginTop: 14, fontFamily: theme.mono, fontWeight: 900, fontSize: 56, color: theme.accent3, background: "rgba(0,0,0,0.6)", border: `4px solid ${theme.accent3}`, borderRadius: 20, padding: "6px 30px" }}>
              {secsLeft}s left
            </div>
          )}
        </div>
      )}

      {/* SCALED 3 boxes */}
      {isScaled && (
        <div style={{ position: "absolute", top: 740, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", opacity: interpolate(frame, [b2526, b2526 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            {[-1, 0, 1].map((k) => (
              <div
                key={k}
                style={{
                  width: 300,
                  height: 200,
                  borderRadius: 28,
                  border: `7px solid ${theme.good}`,
                  background: "rgba(0,200,120,0.28)",
                  boxShadow: `0 0 40px ${theme.good}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `translateX(${k * scaleP * 20}px) translateY(${Math.abs(k) * scaleP * -18}px)`,
                }}
              >
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 40, color: theme.good }}>REDIS</div>
                <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 42, color: "#fff" }}>FULL</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontFamily: theme.font, fontWeight: 900, fontSize: 62, color: theme.good }}>SCALE OUT</div>
        </div>
      )}

      {/* HIT flashes above cache */}
      {frame >= b1596 && frame < b2114 && (
        <div style={{ position: "absolute", top: 668, width: "100%", textAlign: "center", opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 5)) }}>
          <span style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 64, color: theme.good, background: "rgba(0,0,0,0.65)", padding: "4px 30px", borderRadius: 18, border: `4px solid ${theme.good}` }}>
            HIT • HIT • HIT
          </span>
        </div>
      )}

      {/* flood dots bouncing off green cache */}
      {frame >= b1596 && frame < b2114 && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 760, pointerEvents: "none" }}>
          {flood.map((d, i) => {
            const local = ((floodP * 2 + d.d) % 1 + 1) % 1;
            const yFall = d.y0 + local * 260;
            const cappedY = Math.min(yFall, 748);
            const bounced = yFall > 748 ? Math.sin((yFall - 748) / 22) * 36 : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: d.x,
                  top: cappedY - Math.abs(bounced),
                  width: d.s,
                  height: d.s,
                  borderRadius: "50%",
                  background: theme.fg,
                  opacity: 0.9,
                  transform: "translate(-50%,-50%)",
                }}
              />
            );
          })}
        </div>
      )}

      {/* magenta strike arrow */}
      {frame >= b2114 && frame < b2374 && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: strikeY - 90, display: "flex", justifyContent: "center", opacity: interpolate(frame, [b2114, b2114 + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 110, color: theme.accent2, lineHeight: 1, textShadow: `0 0 40px ${theme.accent2}` }}>▼</div>
            <div style={{ fontFamily: theme.mono, fontWeight: 900, fontSize: 44, color: theme.accent2 }}>UPDATE</div>
          </div>
        </div>
      )}

      {/* explosion particles + DELETED puff below arrow, clear of box text */}
      {frame >= sec(21.7) && frame < b2374 && (
        <div style={{ position: "absolute", top: 780, left: 0, width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 400, height: 180 }}>
            {boom.map((p, i) => {
              const ep = interpolate(frame, [sec(21.7), sec(22.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 200 + Math.cos(p.a) * p.dist * ep,
                    top: 60 + Math.sin(p.a) * p.dist * ep,
                    width: p.s,
                    height: p.s,
                    borderRadius: 6,
                    background: i % 2 === 0 ? theme.accent2 : theme.accent3,
                    opacity: 1 - ep,
                    transform: "translate(-50%,-50%) rotate(20deg)",
                  }}
                />
              );
            })}
            <div style={{ position: "absolute", top: 96, width: "100%", textAlign: "center", fontFamily: theme.font, fontWeight: 900, fontSize: 58, color: theme.muted, background: "rgba(0,0,0,0.7)", borderRadius: 16, padding: "6px 0" }}>
              DELETED
            </div>
          </div>
        </div>
      )}

      {/* cache -> DB connector */}
      {frame >= b806 && frame < b1596 && (
        <div style={{ position: "absolute", left: 357, top: 958, width: 6, height: 90, background: theme.accent, borderRadius: 3 }} />
      )}
      {frame >= b2374 && (
        <div style={{ position: "absolute", left: 357, top: isScaled ? 1000 : 958, width: 6, height: 80, background: theme.accent, borderRadius: 3, opacity: 0.9 }} />
      )}

      {/* reload dot dropping through */}
      {frame >= b2374 && frame < sec(25.0) && (
        <div style={{ position: "absolute", left: reloadThrough === 1 ? 357 : 540, top: reloadY, width: 32, height: 32, borderRadius: "50%", background: theme.fg, boxShadow: "0 0 22px #fff", transform: "translate(-50%,-50%)" }} />
      )}

      {/* packet traveling up replica -> cache */}
      {frame >= b806 && frame < b1102 && (
        <div style={{ position: "absolute", left: 357, top: packetY, width: 500, display: "flex", justifyContent: "center", transform: "translateX(-50%)" }}>
          <div style={{ background: "#fff", color: "#0B0E14", borderRadius: 16, fontFamily: theme.mono, fontWeight: 900, fontSize: 40, padding: "8px 22px", border: `4px solid ${theme.accent}` }}>
            user 42
          </div>
        </div>
      )}

      {/* DATABASES row — kept above y=1300 */}
      <div style={{ position: "absolute", top: 1042, width: "100%", display: "flex", justifyContent: "center", gap: 60 }}>
        {/* READ REPLICA */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 380,
              height: 150,
              borderRadius: 24,
              border: `7px solid ${replicaGlow ? theme.accent : theme.muted}`,
              background: replicaGlow ? "rgba(0,229,255,0.18)" : "rgba(255,255,255,0.03)",
              boxShadow: replicaGlow ? `0 0 55px ${theme.accent}` : "none",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "absolute", top: -26, left: 20, right: 20, height: 52, borderRadius: "50%", background: replicaGlow ? theme.accent : "#2A3140", border: `7px solid ${replicaGlow ? theme.accent : theme.muted}` }} />
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 44, color: replicaGlow ? theme.accent : theme.muted, marginTop: 22 }}>READ</div>
          </div>
          <div style={{ marginTop: 12, fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: replicaGlow ? theme.accent : theme.muted }}>READ REPLICA</div>
        </div>
        {/* MAIN DB dim with X */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.85 }}>
          <div style={{ width: 380, height: 150, borderRadius: 24, border: `7px solid ${theme.muted}`, background: "rgba(255,255,255,0.02)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: -26, left: 20, right: 20, height: 52, borderRadius: "50%", background: "#2A3140", border: `7px solid ${theme.muted}` }} />
            <div style={{ fontSize: 110, color: "#E5484D", fontWeight: 900, lineHeight: 1 }}>✕</div>
          </div>
          <div style={{ marginTop: 12, fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.muted, textDecoration: "line-through" }}>MAIN DB</div>
        </div>
      </div>

      {/* writes safe lock — BELOW labels with padding, never covering */}
      {frame >= b2526 && (
        <div style={{ position: "absolute", top: 1290, width: "100%", display: "flex", justifyContent: "center", opacity: interpolate(frame, [b2526, b2526 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, border: `5px solid ${theme.accent3}`, borderRadius: 22, padding: "10px 34px", background: "rgba(0,0,0,0.7)" }}>
            <div style={{ fontSize: 54 }}>🔒</div>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 50, color: theme.accent3 }}>WRITES STAY SAFE</div>
          </div>
        </div>
      )}
      {frame >= b806 && frame < b1102 && (
        <div style={{ position: "absolute", top: 1290, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 48, color: theme.fg }}>main DB untouched</div>
        </div>
      )}
    </AbsoluteFill>
  );
}