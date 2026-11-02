import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, sec, Appear, Title } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fTrick = sec(0.68);
  const fMain = sec(1.6);
  const fLoad = sec(2.68);
  const fPhones = sec(4.02);
  const fInstant = sec(4.4);

  const dbSpringRaw = spring({ frame: Math.max(0, frame - fMain), fps, config: { damping: 14 } });
  const dbSpring = interpolate(dbSpringRaw, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dbScale = interpolate(dbSpring, [0, 1], [0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dbOpacity = interpolate(frame, [fMain, fMain + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const underlineW = interpolate(frame, [fTrick, fTrick + 12], [0, 320], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // calm pulse ring - fast before load drop, slow after
  const period: number = frame < fLoad ? 30 : 78;
  const sinceDb = Math.max(0, frame - fMain);
  const prog = (((sinceDb % period) + period) % period) / period;
  const ringScale = 1 + prog * 0.38;
  const ringOpacity = (1 - prog) * 0.75 * dbOpacity;

  const loadPct = interpolate(frame, [fLoad, fLoad + 26], [88, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const loadOpacity = interpolate(frame, [fLoad, fLoad + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zzzFloat = Math.sin(frame * 0.18) * 7;
  const zzzOpacity = interpolate(frame, [fLoad + 8, fLoad + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const needleBase = interpolate(frame, [fPhones, fInstant, fInstant + 11], [-62, -62, 62], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wobble = frame > fInstant + 11 ? Math.sin((frame - (fInstant + 11)) * 0.5) * 4 * Math.max(0, 1 - (frame - (fInstant + 11)) / 30) : 0;
  const needleAng = needleBase + wobble;
  const isFast = frame >= fInstant;
  const gaugeColor = isFast ? theme.good : "#FF5252";
  const gaugeGlow = isFast
    ? interpolate(frame, [fInstant, fInstant + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  const s0 = spring({ frame: Math.max(0, frame - fPhones), fps, config: { damping: 14 } });
  const s1 = spring({ frame: Math.max(0, frame - (fPhones + 4)), fps, config: { damping: 14 } });
  const s2 = spring({ frame: Math.max(0, frame - (fPhones + 8)), fps, config: { damping: 14 } });
  const phoneSprings = [s0, s1, s2];
  const screenOn = interpolate(frame, [fPhones, fPhones + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const checkIn = interpolate(frame, [fInstant, fInstant + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const checkScale = spring({ frame: Math.max(0, frame - fInstant), fps, config: { damping: 14 } });
  const flash = interpolate(frame, [fInstant, fInstant + 6, fInstant + 18], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bgGlow = 0.12 + (1 - prog) * 0.12;

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* soft bg glow behind DB */}
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 520,
          width: 800,
          height: 560,
          borderRadius: 280,
          background: theme.accent,
          opacity: bgGlow * dbOpacity,
          filter: "blur(140px)",
        }}
      />

      <Title text="THE TRICK" at={fTrick} y={240} size={102} color={theme.fg} />
      <Appear at={fTrick} dy={0} style={{ position: "absolute", top: 372, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ width: underlineW, height: 10, background: theme.accent, borderRadius: 5 }} />
      </Appear>

      {/* MAIN DB cylinder */}
      <div style={{ position: "absolute", top: 520, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", opacity: dbOpacity }}>
        <div style={{ position: "relative", width: 380, height: 300, transform: `scale(${dbScale})` }}>
          {/* pulse ring */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 72,
              width: 360,
              height: 140,
              borderRadius: "50%",
              border: `5px solid ${theme.accent}`,
              transform: `scale(${ringScale})`,
              opacity: ringOpacity,
            }}
          />
          {/* cylinder top */}
          <div style={{ position: "absolute", left: 20, top: 20, width: 340, height: 88, background: theme.fg, borderRadius: "50%", zIndex: 3, border: "4px solid #FFFFFF", boxShadow: `0 0 32px ${theme.accent}55` }} />
          <div style={{ position: "absolute", left: 20, top: 62, width: 340, height: 170, background: theme.fg, zIndex: 2, borderLeft: "4px solid #FFFFFF", borderRight: "4px solid #FFFFFF" }}>
            <div style={{ position: "absolute", left: 18, right: 18, top: 56, height: 4, background: "rgba(0,0,0,0.18)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 18, right: 18, top: 106, height: 4, background: "rgba(0,0,0,0.18)", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 30, top: 14, width: 52, height: 140, background: "rgba(255,255,255,0.55)", borderRadius: 26, filter: "blur(1px)" }} />
          </div>
          <div style={{ position: "absolute", left: 20, top: 188, width: 340, height: 88, background: "#DCE3EA", borderRadius: "50%", zIndex: 1, border: "4px solid #FFFFFF" }} />
        </div>
        <div style={{ marginTop: 6, color: theme.muted, fontFamily: theme.font, fontWeight: 800, fontSize: 48, letterSpacing: 8 }}>
          MAIN DB
        </div>
      </div>

      {/* load bar */}
      <Appear at={fLoad} dy={30} style={{ position: "absolute", top: 920, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ opacity: loadOpacity, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 580, height: 36, background: "#16202E", borderRadius: 18, border: "2px solid #2A3A4E", overflow: "hidden", position: "relative" }}>
            <div style={{ width: `${(loadPct / 100) * 580}px`, height: "100%", background: theme.good, borderRadius: 17, boxShadow: `0 0 18px ${theme.good}` }} />
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ color: theme.fg, fontFamily: theme.font, fontWeight: 900, fontSize: 50 }}>
              ~0% <span style={{ color: theme.good }}>LOAD</span>
            </div>
            <div style={{ color: theme.accent, fontFamily: theme.font, fontWeight: 900, fontSize: 50, opacity: zzzOpacity, transform: `translateY(${zzzFloat}px)` }}>
              Zzz
            </div>
          </div>
        </div>
      </Appear>

      {/* bottom payoff row: gauge left, phones right */}
      <div style={{ position: "absolute", top: 1062, width: "100%", display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 48 }}>
        {/* gauge */}
        <Appear at={fInstant} dy={30} style={{ width: 290, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div>
            <svg width="230" height="142" viewBox="0 0 240 150">
              <path d="M 30 125 A 85 85 0 0 1 210 125" fill="none" stroke="#2A3A4E" strokeWidth={20} strokeLinecap="round" />
              <path d="M 30 125 A 85 85 0 0 1 210 125" fill="none" stroke={gaugeColor} strokeWidth={20} strokeLinecap="round" opacity={isFast ? 0.95 : 0.25} style={{ filter: isFast ? `drop-shadow(0 0 10px ${theme.good})` : undefined }} />
              <circle cx={120} cy={125} r={14} fill="#0E1622" stroke={gaugeColor} strokeWidth={5} />
              <g transform={`rotate(${needleAng} 120 125)`}>
                <rect x={117} y={52} width={6} height={75} rx={3} fill={gaugeColor} />
                <circle cx={120} cy={52} r={7} fill={gaugeColor} />
              </g>
              <text x={38} y={148} fill={isFast ? "#5A6B7E" : "#FF5252"} fontSize={22} fontWeight={900} fontFamily={theme.font}>SLOW</text>
              <text x={178} y={148} fill={isFast ? theme.good : "#5A6B7E"} fontSize={22} fontWeight={900} fontFamily={theme.font}>FAST</text>
            </svg>
            <div style={{ textAlign: "center", marginTop: 2, fontFamily: theme.font, fontWeight: 900, fontSize: 44, color: isFast ? theme.good : theme.fg, opacity: 0.4 + gaugeGlow * 0.6 }}>
              {isFast ? "FAST" : "IDLE"}
            </div>
          </div>
        </Appear>

        {/* phones */}
        <div style={{ width: 500, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 20 }}>
            {[0, 1, 2].map((i) => {
              const s = phoneSprings[i];
              const sc = interpolate(s, [0, 1], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const op = interpolate(s, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ opacity: frame >= fPhones + i * 4 ? op : 0, transform: `scale(${sc})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 100, height: 150, borderRadius: 22, background: "#0B1320", border: "5px solid #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: screenOn > 0.5 ? `0 0 22px ${theme.accent}88` : undefined }}>
                    <div style={{ width: 70, height: 104, borderRadius: 12, background: theme.accent, opacity: 0.25 + screenOn * 0.75 }} />
                    {/* flash */}
                    <div style={{ position: "absolute", left: 6, top: 6, right: 6, bottom: 6, borderRadius: 16, background: theme.good, opacity: flash * 0.55 }} />
                    {/* check badge centered on screen - no text underneath */}
                    <div
                      style={{
                        position: "absolute",
                        left: 23,
                        top: 48,
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        background: theme.good,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `scale(${interpolate(checkScale, [0, 1], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                        opacity: checkIn,
                        border: "4px solid #FFFFFF",
                        boxShadow: `0 0 16px ${theme.good}`,
                      }}
                    >
                      <div style={{ color: "#04120A", fontSize: 34, fontWeight: 900, fontFamily: theme.font }}>✓</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, height: 54 }}>
            {frame >= fInstant ? (
              <div style={{ background: theme.good, borderRadius: 26, paddingLeft: 24, paddingRight: 24, paddingTop: 6, paddingBottom: 6, color: "#04120A", fontFamily: theme.font, fontWeight: 900, fontSize: 40, opacity: checkIn }}>
                ✓ INSTANT
              </div>
            ) : frame >= fPhones ? (
              <div style={{ color: theme.fg, fontFamily: theme.font, fontWeight: 800, fontSize: 38, opacity: screenOn }}>LOADING…</div>
            ) : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}