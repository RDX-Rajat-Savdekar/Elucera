import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const enter = interpolate(f, [sec(0.54), sec(1.15)], [0, 1], C);
  const slide = interpolate(f, [sec(0.54), sec(1.15)], [-80, 0], C);
  const chip = interpolate(f, [sec(2.04), sec(2.4)], [0, 1], C);
  const forever = interpolate(f, [sec(4.24), sec(4.7)], [0, 1], C);
  const badges = interpolate(f, [sec(6.16), sec(6.6)], [0, 1], C);
  const clear = interpolate(f, [sec(9.66), sec(10.05)], [0, 1], C);
  const prog = interpolate(f, [sec(10.92), sec(11.55)], [0, 1], C);
  const dim = interpolate(f, [sec(6.16), sec(6.7)], [1, 0.42], C);
  const speed = f < sec(4.24) ? 1.6 : 7;
  const scrollY = (f * speed) % 300;
  const spin = f * 9;
  const count = Math.round(interpolate(f, [sec(10.92), sec(11.55)], [0, 60], C));
  const lines = [92, 88, 95, 80, 90, 86, 93, 78, 89, 91, 84, 90];
  return (
    <Stage title="Reading takes forever" kicker="Ask anything">
      <Slot area="main">
        <div style={{ opacity: enter, transform: `translateY(${slide}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, fontFamily: theme.font }}>
          <div style={{ background: theme.panel, border: `2px solid ${theme.line}`, borderRadius: 28, padding: "14px 30px", fontSize: 42, fontWeight: 900, color: theme.fg }}>
            black holes or blockchains?
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
            <div style={{ width: 400, height: 640, background: "#1B2030", border: `2px solid ${theme.line}`, borderRadius: 28, padding: 28, opacity: dim, overflow: "hidden", position: "relative" }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: f >= sec(2.04) ? theme.accent : theme.fg, lineHeight: 1.1 }}>BLACK HOLES</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: theme.muted, marginTop: 4 }}>Explained</div>
              <div style={{ display: "flex", gap: 12, marginTop: 14, opacity: chip }}>
                <div style={{ background: theme.accent2, color: "#fff", fontSize: 30, fontWeight: 900, borderRadius: 999, padding: "6px 20px" }}>blockchains</div>
              </div>
              <div style={{ marginTop: 16, transform: `translateY(${-scrollY}px)` }}>
                {lines.map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: 16, borderRadius: 8, background: "#3A4258", marginBottom: 14 }} />
                ))}
                {lines.map((w, i) => (
                  <div key={"b" + i} style={{ width: `${w}%`, height: 16, borderRadius: 8, background: "#3A4258", marginBottom: 14 }} />
                ))}
              </div>
              <div style={{ position: "absolute", bottom: 22, left: 28, right: 28, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ transform: `rotate(${spin}deg)`, display: "flex" }}><Icon name="Clock" size={56} color={theme.accent3} /></div>
                <div style={{ fontSize: 30, fontWeight: 800, color: theme.muted }}>scrolling…</div>
              </div>
              <div style={{ position: "absolute", top: 250, left: 30, right: 30, opacity: forever, transform: `rotate(-10deg) scale(${0.7 + forever * 0.3})`, border: "6px solid #FF3B3B", color: "#FF3B3B", fontSize: 62, fontWeight: 900, textAlign: "center", borderRadius: 16, background: "rgba(0,0,0,0.55)" }}>FOREVER</div>
              <div style={{ position: "absolute", top: 380, left: 30, right: 30, opacity: badges, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ background: "#FF3B3B", color: "#fff", fontSize: 46, fontWeight: 900, padding: "8px 30px", borderRadius: 14, transform: "rotate(-6deg)" }}>TOO LONG</div>
                <div style={{ background: "#FF3B3B", color: "#fff", fontSize: 46, fontWeight: 900, padding: "8px 30px", borderRadius: 14, transform: "rotate(5deg)" }}>TOO VAGUE</div>
              </div>
            </div>
            <div style={{ width: 116, height: 116, borderRadius: 999, background: "#fff", color: "#111", fontSize: 56, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.5 + enter * 0.5})` }}>VS</div>
            <div style={{ width: 400, height: 640, background: clear > 0.5 ? "#0E2A26" : "#101828", border: `4px solid ${clear > 0.5 ? theme.good : theme.accent}`, borderRadius: 28, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", boxShadow: clear > 0.5 ? "0 0 60px rgba(0,230,160,0.5)" : "0 0 40px rgba(0,229,255,0.25)" }}>
              <div style={{ opacity: clear, display: "flex", alignItems: "center", gap: 10 }}><Icon name="Check" size={64} color={theme.good} /><div style={{ color: theme.good, fontSize: 40, fontWeight: 900 }}>CLEAR</div></div>
              <div style={{ marginTop: 10 }}><Icon name="Play" size={150} color={theme.accent} /></div>
              <div style={{ opacity: clear, marginTop: 8, fontSize: 52, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.05 }}>CLEAR<br />ANSWER</div>
              <div style={{ marginTop: "auto", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: theme.accent, fontFamily: theme.mono }}>0:{String(count).padStart(2, "0")}</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>60s</div>
                </div>
                <div style={{ height: 26, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
                  <div style={{ width: `${prog * 100}%`, height: "100%", background: theme.accent, borderRadius: 999 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Slot>
      <Slot area="below" at={sec(6.16)}>
        <div style={{ display: "flex", gap: 16, fontFamily: theme.font, fontSize: 34, fontWeight: 900 }}>
          <div style={{ opacity: badges, background: "#FF3B3B", color: "#fff", padding: "10px 26px", borderRadius: 999 }}>✕ ARTICLE</div>
          <div style={{ opacity: clear, background: theme.good, color: "#06281F", padding: "10px 26px", borderRadius: 999 }}>✓ 60s VIDEO</div>
        </div>
      </Slot>
    </Stage>
  );
}