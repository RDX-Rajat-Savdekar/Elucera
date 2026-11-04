import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const sec = (t: number) => Math.round(t * 30);
const theme = { bg: "#0B1020", fg: "#F5F7FA", muted: "#8A93A6", accent: "#22D3EE", accent3: "#FFD166", good: "#06D6A0", bad: "#FF4D6D", panel: "#151B2E", line: "#2A3350", font: "Inter,system-ui,sans-serif", mono: "JetBrains Mono,monospace" };

export default function Scene() {
  const f = useCurrentFrame();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const on = (at: number) => interpolate(f, [at, at + 10], [0, 1], cl);
  const p1 = interpolate(f, [sec(7.94), sec(9.9)], [0, 1], cl);
  const p2 = interpolate(f, [sec(18.62), sec(20.4)], [0, 1], cl);
  const listSel = f >= sec(14.8);
  const running = f >= sec(17.48) && f < sec(20.4);
  const spin = f * 14;
  const busyOn = on(sec(18.62));
  const ansOn = on(sec(22.12));
  const dOn = f >= sec(23.8);
  const cOn = f >= sec(24.56);
  const aOn = f >= sec(25.3);
  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: "center" }}>
      <div style={{ marginTop: 90, textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 32, color: theme.accent, letterSpacing: 4 }}>MCP IN ACTION</div>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 76, color: theme.fg }}>Ask what&apos;s free Friday</div>
      </div>
      <div style={{ opacity: on(sec(0.56)), marginTop: 18, background: theme.fg, color: "#0B1020", borderRadius: 30, padding: "12px 30px", fontFamily: theme.font, fontWeight: 900, fontSize: 50 }}>what&apos;s free Friday?</div>
      <div style={{ opacity: on(sec(3.52)), display: "flex", flexDirection: "row", alignItems: "center", gap: 22, marginTop: 34 }}>
        <div style={{ width: 300, background: theme.panel, border: `5px solid ${theme.accent}`, borderRadius: 26, padding: "20px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: `0 0 30px ${theme.accent}` }}>
          <div style={{ fontSize: 84 }}>{"💻"}</div>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 52, color: theme.fg }}>APP</div>
          <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 32, color: theme.accent }}>MCP CLIENT</div>
        </div>
        <div style={{ position: "relative", width: 200, height: 18, background: theme.accent, borderRadius: 9, boxShadow: `0 0 24px ${theme.accent}` }}>
          <div style={{ position: "absolute", left: -10, top: -8, width: 26, height: 34, borderRadius: 8, background: theme.accent }} />
          <div style={{ position: "absolute", right: -10, top: -8, width: 26, height: 34, borderRadius: 8, background: theme.accent }} />
          {f >= sec(7.94) && f < sec(10.2) && (
            <div style={{ position: "absolute", left: p1 * 170 - 8, top: -24, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontFamily: theme.mono, fontWeight: 800, fontSize: 26, color: theme.accent, background: "#0B1020", padding: "2px 10px", borderRadius: 10, border: `2px solid ${theme.accent}` }}>tools/list</div>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: theme.accent, boxShadow: `0 0 18px ${theme.accent}`, marginTop: 4 }} />
            </div>
          )}
          {f >= sec(18.62) && f < sec(20.6) && (
            <div style={{ position: "absolute", left: (1 - p2) * 170 - 8, top: -8, display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: 15, background: theme.bad, boxShadow: `0 0 18px ${theme.bad}` }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 340, background: theme.panel, border: `5px solid ${theme.accent3}`, borderRadius: 26, padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: `0 0 30px ${theme.accent3}` }}>
          <div style={{ fontSize: 72 }}>{"🗄️"}</div>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 40, color: theme.fg }}>CALENDAR</div>
          <div style={{ opacity: on(sec(9.98)), display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <div style={{ borderRadius: 14, padding: "10px 12px", fontFamily: theme.font, fontWeight: 900, fontSize: 36, textAlign: "center", background: listSel ? theme.accent3 : theme.fg, color: "#0B1020", boxShadow: listSel || running ? `0 0 22px ${theme.accent3}` : "none" }}>List events{running ? " ⟳" : ""}</div>
            <div style={{ borderRadius: 14, padding: "10px 12px", fontFamily: theme.font, fontWeight: 800, fontSize: 31, textAlign: "center", background: "#232B45", color: listSel ? theme.muted : theme.fg, opacity: listSel ? 0.45 : 1 }}>create event</div>
            {f >= sec(14.8) && <div style={{ alignSelf: "center", fontFamily: theme.mono, fontWeight: 800, fontSize: 30, color: "#0B1020", background: theme.accent, borderRadius: 20, padding: "4px 18px" }}>Friday</div>}
            {running && <div style={{ alignSelf: "center", width: 42, height: 42, borderRadius: 21, border: `6px solid ${theme.accent}`, borderTopColor: "transparent", transform: `rotate(${spin}deg)` }} />}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 30 }}>
        <div style={{ opacity: busyOn, display: "flex", gap: 12 }}>
          {["9-11", "11-12:30", "1-3"].map((t) => (
            <div key={t} style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 36, color: "#fff", background: theme.bad, borderRadius: 14, padding: "6px 18px" }}>{t}</div>
          ))}
        </div>
        <div style={{ opacity: ansOn, display: "flex", alignItems: "center", gap: 12, background: theme.fg, borderRadius: 24, padding: "10px 26px" }}>
          <div style={{ fontSize: 52, color: theme.good, fontWeight: 900 }}>✓</div>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: "#0B1020" }}>You&apos;re free after 3pm</div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          {[{ l: "Discover", o: dOn, c: theme.accent }, { l: "Call", o: cOn, c: theme.accent3 }, { l: "Answer", o: aOn, c: theme.good }].map((b) => (
            <div key={b.l} style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 34, color: b.o ? b.c : theme.muted, border: `4px solid ${b.o ? b.c : theme.line}`, borderRadius: 20, padding: "6px 22px", opacity: b.o ? 1 : 0.45, boxShadow: b.o ? `0 0 18px ${b.c}` : "none" }}>{b.l}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}