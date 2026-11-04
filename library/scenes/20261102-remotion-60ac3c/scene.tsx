import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
const sec = (t: number) => Math.round(t * 30);
const theme = { bg: "#0B1020", fg: "#F5F7FA", muted: "#8A93A6", accent: "#22D3EE", accent2: "#F471B5", good: "#06D6A0", bad: "#FF4D6D", panel: "#151B2E", line: "#2A3350", font: "Inter,system-ui,sans-serif" };
function Stage({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{ position: "absolute", top: 110, width: 1080, textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 32, color: theme.accent, letterSpacing: 4 }}>{kicker}</div>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 84, color: theme.fg }}>{title}</div>
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920 }}>{children}</div>
    </AbsoluteFill>
  );
}
function Slot({ at, outAt, children }: { at?: number; outAt?: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const a = at ?? 0;
  const o = interpolate(f, [a, a + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o2 = outAt === undefined ? 1 : 1 - interpolate(f, [outAt, outAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = o * o2;
  if (op <= 0) return null;
  return <div style={{ position: "absolute", top: 460, left: 0, width: 1080, height: 720, display: "flex", alignItems: "center", justifyContent: "center", opacity: op }}>{children}</div>;
}
function Emoji({ e, size, label, color }: { e: string; size: number; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: size, lineHeight: 1 }}>{e}</div>
      <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 34, color: color ?? theme.fg }}>{label}</div>
    </div>
  );
}
export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const plugS = spring({ frame: Math.max(0, f - sec(1.48)), fps, config: { damping: 14 } });
  const linesG = interpolate(f, [sec(1.48), sec(2.36)], [0, 1], cl);
  const tangleO = 1 - interpolate(f, [sec(0.66), sec(1.48)], [0, 1], cl);
  const shieldS = spring({ frame: Math.max(0, f - sec(4.92)), fps, config: { damping: 14 } });
  const cableG = interpolate(f, [sec(7.64), sec(8.66)], [0, 1], cl);
  const checkS = spring({ frame: Math.max(0, f - sec(9.32)), fps, config: { damping: 14 } });
  return (
    <Stage title="One plug does it all" kicker="MCP PAYOFF">
      <Slot at={sec(0.66)} outAt={sec(4.92)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ opacity: tangleO, display: "flex", gap: 10, height: 40 }}>
            {[-24, 0, 24].map((r, i) => <div key={i} style={{ width: 90, height: 10, borderRadius: 5, background: theme.bad, transform: `rotate(${r}deg)`, opacity: tangleO }} />)}
          </div>
          <div style={{ transform: `scale(${Math.max(0.01, plugS)})`, width: 290, height: 290, borderRadius: 145, display: "flex", alignItems: "center", justifyContent: "center", background: "#0E162E", border: `6px solid ${theme.accent}`, boxShadow: `0 0 80px ${theme.accent}` }}>
            <Emoji e="🔌" size={140} label="one plug" color={theme.accent} />
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 80, opacity: linesG }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 10, height: Math.max(1, 80 * linesG), background: theme.accent, borderRadius: 5 }} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 70, opacity: linesG }}>
            <Emoji e="📅" size={90} label="calendar" />
            <Emoji e="✈️" size={90} label="flights" />
            <Emoji e="💾" size={90} label="data" />
          </div>
        </div>
      </Slot>
      <Slot at={sec(4.92)} outAt={sec(7.64)}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 70 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 200, height: 170, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Emoji e="🤖" size={120} label="model" />
              <div style={{ position: "absolute", width: 180, height: 12, borderRadius: 6, background: theme.bad, transform: "rotate(-32deg)" }} />
            </div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 44, textDecoration: "line-through", color: theme.bad }}>password</div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 38, color: theme.fg }}>no touch</div>
          </div>
          <div style={{ width: 6, height: 300, background: theme.line, borderRadius: 3 }} />
          <div style={{ transform: `scale(${Math.max(0.01, shieldS)})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 210, height: 210, borderRadius: 36, background: "#0B2018", border: `6px solid ${theme.good}`, boxShadow: `0 0 60px ${theme.good}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Emoji e="🔒" size={110} label="password" />
            </div>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 40, color: theme.good }}>stays on server</div>
          </div>
        </div>
      </Slot>
      <Slot at={sec(7.64)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div style={{ background: theme.fg, color: "#0B1020", borderRadius: 28, padding: "18px 28px", fontFamily: theme.font, fontWeight: 900, fontSize: 48, maxWidth: 360 }}>{"What's free Friday?"}</div>
            <div style={{ width: Math.max(1, 200 * cableG), height: 14, background: theme.accent, borderRadius: 7, boxShadow: `0 0 30px ${theme.accent}` }} />
            <div style={{ position: "relative" }}>
              <Emoji e="📅" size={140} label="calendar" />
              <div style={{ position: "absolute", right: -14, top: -14, width: 80, height: 80, borderRadius: 40, background: theme.good, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.max(0.01, checkS)})`, boxShadow: `0 0 40px ${theme.good}`, fontSize: 52, fontWeight: 900, color: "#0B1020" }}>✓</div>
            </div>
          </div>
          <div style={{ transform: `scale(${Math.max(0.01, checkS)})`, background: theme.good, color: "#0B1020", borderRadius: 30, padding: "14px 34px", fontFamily: theme.font, fontWeight: 900, fontSize: 52 }}>{"You're free after 3pm"}</div>
        </div>
      </Slot>
    </Stage>
  );
}