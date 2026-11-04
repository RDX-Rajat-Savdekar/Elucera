import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow, Callout, Icon, ProblemCard, Slot, Stage, sec, theme } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const leftX = interpolate(f, [sec(0.64), sec(1.5)], [-420, 0], cl);
  const rightX = interpolate(f, [sec(0.64), sec(1.5)], [420, 0], cl);
  const lrO = interpolate(f, [sec(0.64), sec(1.0)], [0, 1], cl);
  const wifiO = interpolate(f, [sec(2.5), sec(2.9)], [0, 1], cl);
  const msgO = interpolate(f, [sec(2.88), sec(3.2)], [0, 1], cl) * (1 - interpolate(f, [sec(4.7), sec(5.1)], [0, 1], cl));
  const envO = interpolate(f, [sec(4.2), sec(4.6)], [0, 1], cl);
  const envP = interpolate(f, [sec(5.72), sec(7.46)], [0, 1], cl);
  const envX = interpolate(f, [sec(5.72), sec(7.46)], [-260, 0], cl);
  const wob = Math.sin(f * 0.35) * 16 * envO;
  const rot = Math.sin(f * 0.3) * 8 * envP;
  const hackS = spring({ frame: Math.max(0, f - sec(7.46)), fps, config: { damping: 14 } });
  const hackO = interpolate(f, [sec(7.46), sec(7.7)], [0, 1], cl);
  const crackO = interpolate(f, [sec(7.46), sec(7.7)], [0, 1], cl);
  const shake = f >= sec(7.46) ? Math.sin(f * 1.4) * 12 : 0;
  return (
    <Stage title="Secrets over open Wi-Fi" kicker="PUBLIC NETWORK">
      <Slot area="main" outAt={sec(8.28)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 70, alignItems: "flex-start", justifyContent: "center" }}>
            <div style={{ opacity: lrO, transform: `translateX(${leftX}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: 280 }}>
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 56, color: theme.fg }}>YOU</div>
              <Icon name="Laptop" size={150} color={theme.fg} label="you laptop" />
              <div style={{ opacity: msgO, background: "#F5F7FA", borderRadius: 18, padding: "12px 18px", fontFamily: theme.mono, fontWeight: 800, fontSize: 48, color: "#0B1020" }}>password:1234</div>
            </div>
            <div style={{ opacity: wifiO, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 300 }}>
              <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.muted }}>OPEN WI-FI</div>
              <div style={{ position: "relative", width: 170, height: 170, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {[0, 1, 2].map((i) => {
                  const ph = (((f - sec(2.5)) / 24 - i * 0.33) % 1 + 1) % 1;
                  return <div key={i} style={{ position: "absolute", width: 150, height: 150, borderRadius: 90, border: `6px solid ${theme.accent}`, opacity: wifiO * (1 - ph) * 0.9, transform: `scale(${0.4 + ph * 1.1})` }} />;
                })}
                <Icon name="Wifi" size={110} color={theme.accent} />
              </div>
              <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.muted }}>coffee shop</div>
            </div>
            <div style={{ opacity: lrO, transform: `translateX(${rightX}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: 280 }}>
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 56, color: theme.fg }}>FRIEND</div>
              <Icon name="Laptop" size={150} color={theme.fg} label="friend laptop" />
            </div>
          </div>
          <div style={{ width: 680, height: 240, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ opacity: envO, transform: `translateX(${envX}px) translateY(${wob}px) rotate(${rot}deg) translateX(${shake * 0.3}px)`, background: theme.bad, borderRadius: 20, padding: "22px 36px", display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 40px ${theme.bad}` }}>
              <div style={{ fontFamily: theme.mono, fontWeight: 900, fontSize: 52, color: "#FFFFFF" }}>password123</div>
              {crackO > 0 && <div style={{ opacity: crackO, fontFamily: theme.font, fontWeight: 900, fontSize: 56, color: "#FFFFFF" }}>{"✕"}</div>}
            </div>
            <div style={{ position: "absolute", opacity: hackO, transform: `scale(${hackS})`, marginTop: 190 }}>
              <Icon name="Eye" size={130} color={theme.accent2} label="hacker" ring />
            </div>
          </div>
        </div>
      </Slot>
      <Arrow from={[200, 880]} to={[880, 880]} at={sec(5.72)} outAt={sec(8.28)} dashed color={theme.muted} />
      <Callout x={540} y={1080} text="STOLEN!" side="bottom" color={theme.bad} at={sec(7.46)} outAt={sec(8.28)} />
      <Slot area="main" at={sec(8.28)}>
        <ProblemCard title="How to share secret in public?" difficulty="Medium" tags={["crypto", "key-exchange"]} at={sec(8.28)} />
      </Slot>
    </Stage>
  );
}