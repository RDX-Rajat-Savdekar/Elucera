import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow, Callout, Headline, Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b0 = sec(0.48);
  const b1 = sec(3.18);
  const b2 = sec(6.08);
  const b3 = sec(8.66);
  const b4 = sec(11.46);
  const b5 = sec(14.48);
  const b6 = sec(17.72);
  const b7 = sec(20.7);
  const b8 = sec(24.42);
  const b9 = sec(28.22);
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const hero = f >= b1 ? spring({ frame: f - b1, fps, config: { damping: 14 } }) : 0;
  const flash = interpolate(f, [b4, b4 + 5, b4 + 22], [0, 1, 0], cl);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.3);
  const drift = -((f * 5) % 80);
  const bgMix = interpolate(f, [b0, b9], [0, 1], cl);
  const dots = [[-210, -60], [-90, 70], [0, 0], [130, -50], [200, 80]];
  const blueOp1 = interpolate(f, [b3, b3 + 12], [0.35, 1], cl);
  const redDim1 = interpolate(f, [b3, b3 + 12], [0.9, 0.2], cl);
  const blueDim2 = interpolate(f, [b6, b6 + 12], [1, 0.2], cl);
  const redOp2 = interpolate(f, [b6, b6 + 12], [0.25, 1], cl);
  const redX = interpolate(f, [b7, b8], [-260, 260], cl);
  const wash = interpolate(f, [b9, b9 + 25], [0, 1], cl);
  return (
    <Stage title="Why Sky Is Blue" kicker="Sunbeam + Air">
      <Slot area="main" at={b0} outAt={b3}>
        <div style={{ width: 860, height: 640, position: "relative", background: `rgba(14,42,107,${0.25 + bgMix * 0.2})`, borderRadius: 36, overflow: "hidden", border: `2px solid ${theme.line}` }}>
          <div style={{ position: "absolute", left: -160, top: 40, width: 1150, height: 150, transform: "rotate(-18deg)", background: "linear-gradient(90deg,rgba(255,250,220,0.9),rgba(255,250,220,0.08))", opacity: 0.85 }} />
          <svg width="860" height="640" style={{ position: "absolute", inset: 0 }}>
            <g transform={`translate(${drift},0)`} opacity={0.9}>
              <path d="M-100 240 L-20 200 L60 280 L140 200 L220 280 L300 200 L380 280 L460 200 L540 280 L620 200 L700 280 L780 200 L860 280 L940 200" fill="none" stroke={theme.accent} strokeWidth={10} />
            </g>
            <g opacity={0.9}>
              <path d="M-20 300 Q60 220 140 300 T300 300 T460 300 T620 300 T780 300 T940 300" fill="none" stroke={theme.bad} strokeWidth={10} />
            </g>
          </svg>
          {dots.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: 430 + d[0], top: 320 + d[1], width: i === 2 ? 34 + hero * 14 : 20, height: i === 2 ? 34 + hero * 14 : 20, borderRadius: "50%", background: theme.fg, boxShadow: `0 0 ${18 + pulse * 22}px ${theme.accent}`, transform: "translate(-50%,-50%)" }} />
          ))}
          <div style={{ position: "absolute", left: 430, top: 320, width: 110, height: 110, borderRadius: "50%", border: `5px solid ${theme.accent3}`, transform: `translate(-50%,-50%) scale(${Math.max(0.001, hero)})`, opacity: hero > 0.1 ? 1 : 0 }} />
        </div>
      </Slot>
      <Slot area="main" at={b3} outAt={b6}>
        <div style={{ width: 860, height: 640, position: "relative", background: "#0B1A3D", borderRadius: 36, overflow: "hidden", border: `2px solid ${theme.line}` }}>
          <div style={{ position: "absolute", left: -160, top: 60, width: 1150, height: 170, transform: "rotate(-18deg)", background: "linear-gradient(90deg,rgba(255,250,220,0.9),rgba(255,250,220,0.06))" }} />
          <svg width="860" height="640" style={{ position: "absolute", inset: 0 }}>
            <g transform={`translate(${drift},0)`} opacity={blueOp1}>
              <path d="M-100 260 L0 190 L100 330 L200 190 L300 330 L400 190 L500 330 L600 190 L700 330 L800 190 L900 330" fill="none" stroke={theme.accent} strokeWidth={16} />
            </g>
            <g opacity={0.25}><path d="M-20 340 Q80 270 180 340 T380 340 T580 340 T780 340 T980 340" fill="none" stroke={theme.bad} strokeWidth={10} /></g>
            <g opacity={interpolate(f, [b5, b5 + 12], [0, 1], cl)}>
              {[[0, -190], [0, 190], [-250, 0], [250, 0], [-170, -130], [170, -130], [-170, 130], [170, 130]].map((v, i) => (
                <line key={i} x1={430} y1={330} x2={430 + v[0]} y2={330 + v[1]} stroke={theme.accent} strokeWidth={10} strokeLinecap="round" />
              ))}
            </g>
          </svg>
          <div style={{ position: "absolute", left: 430, top: 330, width: 44, height: 44, borderRadius: "50%", background: theme.fg, boxShadow: `0 0 ${30 + pulse * 30 + flash * 60}px ${theme.accent}`, transform: "translate(-50%,-50%)" }} />
          <div style={{ position: "absolute", left: 430, top: 330, width: 200, height: 200, borderRadius: "50%", background: "#FFFFFF", opacity: flash * 0.85, transform: "translate(-50%,-50%)" }} />
        </div>
      </Slot>
      <Slot area="main" at={b6} outAt={b8}>
        <div style={{ width: 860, height: 640, position: "relative", background: "#0B1A3D", borderRadius: 36, overflow: "hidden", border: `2px solid ${theme.line}` }}>
          <div style={{ position: "absolute", left: -160, top: 90, width: 1150, height: 150, transform: "rotate(-8deg)", background: "linear-gradient(90deg,rgba(255,220,220,0.85),rgba(255,220,220,0.05))" }} />
          <svg width="860" height="640" style={{ position: "absolute", inset: 0 }}>
            <g opacity={blueDim2}><path d="M-100 220 L-20 190 L60 250 L140 190 L220 250 L300 190 L380 250 L460 190 L540 250 L620 190 L700 250 L940 190" fill="none" stroke={theme.accent} strokeWidth={8} /></g>
            <g transform={`translate(${redX},0)`} opacity={redOp2}>
              <path d="M-260 330 Q-160 230 -60 330 T140 330 T340 330 T540 330 T740 330 T940 330 T1140 330" fill="none" stroke={theme.bad} strokeWidth={18} />
            </g>
          </svg>
          {[[-180, 60], [40, -70], [190, 60]].map((d, i) => (
            <div key={i} style={{ position: "absolute", left: 430 + d[0], top: 330 + d[1], width: 18, height: 18, borderRadius: "50%", background: theme.fg, boxShadow: `0 0 16px ${theme.accent}` }} />
          ))}
        </div>
      </Slot>
      <Slot area="main" at={b8}>
        <div style={{ width: 860, height: 640, position: "relative", background: `rgba(20,90,220,${0.25 + wash * 0.6})`, borderRadius: 36, overflow: "hidden", border: `2px solid ${theme.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 26 }}>
            {[theme.accent, theme.accent2, theme.accent3].map((c, i) => (
              <div key={i} style={{ width: 200, height: 130, borderRadius: 24, background: "rgba(10,25,60,0.9)", border: `3px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="Waves" size={72} color={theme.accent} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}><Icon name="Eye" size={130} color={theme.fg} /></div>
        </div>
      </Slot>
      <Slot area="below" at={b1} outAt={b6}>
        <Headline text={f < b2 ? "TINY AIR MOLECULE" : f < b3 ? "WAY SMALLER THAN WAVE" : f < sec(17.0) ? "BOUNCES EVERYWHERE" : "SHORT CHOPPY BLUE"} size={68} color={f < b2 ? theme.fg : theme.accent3} />
      </Slot>
      <Slot area="below" at={b6} outAt={b8}>
        <Headline text="LONG SMOOTH RED WAVE" size={68} color={theme.fg} />
      </Slot>
      <Slot area="below" at={b8}>
        <Headline text="ALL DIRECTIONS AT ONCE" size={68} color={theme.accent} />
      </Slot>
      <Callout x={700} y={520} text="dot << wave" at={b2} outAt={b3} side="right" color={theme.accent3} />
      <Arrow from={[540, 700]} to={[540, 500]} at={b5} outAt={b6} color={theme.accent} />
      <Arrow from={[540, 900]} to={[540, 1080]} at={sec(15.52)} outAt={b6} color={theme.accent} />
      <Arrow from={[300, 800]} to={[120, 800]} at={sec(16.58)} outAt={b6} color={theme.accent} />
      <Arrow from={[220, 850]} to={[840, 850]} at={b7} outAt={b8} color={theme.bad} />
      <Arrow from={[240, 600]} to={[500, 950]} at={b8} outAt={b9} color={theme.accent} />
      <Arrow from={[840, 600]} to={[580, 950]} at={b8} outAt={b9} color={theme.accent} />
    </Stage>
  );
}