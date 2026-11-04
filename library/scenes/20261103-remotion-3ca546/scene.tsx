import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Stage, Slot, sec, theme, Icon, Pill, Progress, Typewriter } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const fade = (at: number, dur = 10) => interpolate(f, [at, at + dur], [0, 1], cl);
  const out = (at: number) => interpolate(f, [at, at + 10], [1, 0], cl);
  const pop = (at: number) => spring({ frame: Math.max(0, f - at), fps, config: { damping: 14 } });
  const blocks = [
    { n: "1 HOOK", label: "Hook", c: theme.accent },
    { n: "2 SETUP", label: "Setup", c: theme.accent2 },
    { n: "3 HOW", label: "Mechanism", c: theme.accent3 },
    { n: "4 PAYOFF", label: "Payoff", c: theme.good },
  ];
  const cascadeAt = [sec(5.4), sec(6.52), sec(7.92), sec(8.7)];
  const doneAll = f >= sec(8.7);
  const blues = [40, 130, 210, 300, 390, 480, 570, 660, 750, 120, 350, 600];
  const reds = [0, 1, 2, 3, 4, 5];
  const cap1 = fade(sec(21.1));
  const cap2 = fade(sec(21.64));
  return (
    <Stage title="Why is sky blue?" kicker="ELUCERA EXPLAINS">
      <Slot area="main" outAt={sec(3.5)}>
        <div style={{ opacity: out(sec(3.1)), background: "#fff", borderRadius: 28, padding: "26px 40px", width: 780 }}>
          <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 56, color: "#0B1020" }}>
            {f >= sec(0.86) ? <Typewriter text="why is the sky blue?" at={sec(0.86)} cps={14} /> : null}
            <span style={{ opacity: Math.floor(f / 8) % 2 === 0 ? 1 : 0 }}>{"|"}</span>
          </div>
        </div>
      </Slot>
      <Slot area="main" at={sec(3.52)} outAt={sec(13.4)}>
        <div style={{ opacity: fade(sec(3.52)) * out(sec(12.9)), display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "340px 340px", gap: 18 }}>
            {blocks.map((b, i) => {
              const e = interpolate(f, [sec(3.52) + i * 8, sec(3.52) + i * 8 + 14], [220, 0], cl);
              const lit = f >= cascadeAt[i];
              return (
                <div key={b.n} style={{ transform: `translateY(${e}px) scale(${pop(sec(3.52) + i * 8)})`, background: theme.panel, border: `5px solid ${lit || doneAll ? b.c : theme.line}`, borderRadius: 22, padding: "18px 10px", textAlign: "center", boxShadow: lit ? `0 0 28px ${b.c}` : "none" }}>
                  <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 50, color: lit || doneAll ? b.c : theme.fg }}>{b.label}</div>
                  <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 34, color: theme.fg }}>{doneAll ? "✓" : b.n.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ opacity: fade(sec(5.4)), fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: theme.accent3 }}>4 BEATS</div>
          <div style={{ opacity: fade(sec(10.38)), display: "flex", alignItems: "center", gap: 14, background: theme.panel, borderRadius: 20, padding: "10px 24px" }}>
            <Icon name="Mic" size={56} color={theme.accent} />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const h = 12 + 26 * Math.abs(Math.sin(f / 6 + i * 0.7));
                return <div key={i} style={{ width: 10, height: h, borderRadius: 5, background: theme.accent }} />;
              })}
            </div>
          </div>
        </div>
      </Slot>
      <Slot area="main" at={sec(13.5)}>
        <div style={{ opacity: fade(sec(13.5)), width: 900 }}>
          <div style={{ position: "relative", height: 480, borderRadius: 30, overflow: "hidden", background: "linear-gradient(180deg,#10224D 0%,#2A6CB6 55%,#7DB9E8 100%)", border: `4px solid ${theme.line}` }}>
            <div style={{ position: "absolute", left: 50, top: 150, width: 130, height: 130, borderRadius: 65, background: theme.accent3, boxShadow: `0 0 60px ${theme.accent3}` }} />
            {[0, 1, 2, 3, 4].map((i) => {
              const p = f >= sec(13.5) ? ((f - sec(13.5)) * 3 + i * 40) % 260 : 0;
              return <div key={i} style={{ position: "absolute", left: 150 + p, top: 170 + (i - 2) * 44, width: 90 - p * 0.18, height: 10, borderRadius: 5, background: theme.accent, opacity: fade(sec(13.5)) }} />;
            })}
            {blues.map((bx, i) => {
              const vis = interpolate(f, [sec(16.86) + i * 2, sec(16.86) + i * 2 + 10], [0, 1], cl);
              const zx = bx + 40 * Math.sin(f / 8 + i * 1.7);
              const zy = 90 + ((i * 67) % 300) + 34 * Math.abs(Math.sin(f / 5 + i));
              return <div key={i} style={{ position: "absolute", left: zx, top: zy, width: 20, height: 20, borderRadius: 10, background: "#4DA6FF", boxShadow: `0 0 14px ${theme.accent}`, opacity: vis }} />;
            })}
            {reds.map((_, i) => {
              const loop = f >= sec(18.78) ? (f - sec(18.78) + i * 28) % 150 : -100;
              const x = -40 + loop * 6.4;
              const y = 120 + i * 52;
              return f >= sec(18.78) ? <div key={i} style={{ position: "absolute", left: x, top: y, width: 110, height: 16, borderRadius: 8, background: "#FF4D6D", opacity: 0.95 }} /> : null;
            })}
            <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center" }}>
              <div style={{ opacity: cap1, display: "inline-block", fontFamily: theme.font, fontWeight: 900, fontSize: 72, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "6px 26px", borderRadius: 16 }}>BLUE BOUNCES</div>
              <div style={{ height: 12 }} />
              <div style={{ opacity: cap2, display: "inline-block", fontFamily: theme.font, fontWeight: 900, fontSize: 72, color: "#0B1020", background: theme.accent3, padding: "6px 26px", borderRadius: 16 }}>RED PASSES</div>
            </div>
          </div>
        </div>
      </Slot>
      <Slot area="below" at={sec(24.64)}>
        <div style={{ opacity: fade(sec(24.64)), display: "flex", flexDirection: "row", alignItems: "center", gap: 22 }}>
          <Icon name="Smartphone" size={86} color={theme.good} />
          <Pill text="60s VERTICAL" color={theme.good} solid at={sec(24.64)} />
          <Icon name="Send" size={60} color={theme.accent} />
          <Icon name="Heart" size={60} color={theme.accent2} />
          <div style={{ width: 220 }}><Progress value={f >= sec(24.64) ? ((f - sec(24.64)) % 90) / 90 : 0} at={sec(24.64)} dur={90} /></div>
        </div>
      </Slot>
    </Stage>
  );
}