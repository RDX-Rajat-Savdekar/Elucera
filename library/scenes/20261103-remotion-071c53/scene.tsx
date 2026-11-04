import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Stage, Slot, sec, theme, Icon, Pill, Arrow } from "@kit";

export default function Scene() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const on = (at: number) => interpolate(f, [at, at + 10], [0, 1], cl);
  const pop = (at: number) => spring({ frame: Math.max(0, f - at), fps, config: { damping: 14 } });
  const fPub = sec(2.69);
  const fPriv = sec(5.17);
  const fFriend = sec(7.83);
  const fBox = sec(10.49);
  const f42 = sec(12.61);
  const fEyes = sec(14.93);
  const fKey = sec(17.41);
  const fOpen = sec(20.27);
  const fEnd = sec(23.39);
  const friendIn = interpolate(f, [fFriend, fFriend + 18], [600, 0], cl);
  const is42 = f >= f42 && f < fOpen;
  const isOpen = f >= fOpen;
  const locked = f >= fBox && !isOpen;
  const fly = interpolate(f, [fFriend, fFriend + 28], [0, 1], cl);
  const backFly = interpolate(f, [fKey, fKey + 25], [0, 1], cl);
  const shake = f >= f42 && f < fEyes ? Math.sin(f * 1.2) * 10 : 0;
  const pulse = 1 + Math.sin(f * 0.25) * 0.05;
  const showEyes = f >= fEyes && f < fKey + 10;
  return (
    <Stage title="Two linked keys" kicker="PUBLIC KEY CRYPTO">
      <Slot area="main">
        <div style={{ width: 940, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 120, alignItems: "flex-start", opacity: on(sec(0.43)) }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `scale(${pop(sec(0.43))})` }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                <div style={{ transform: `scale(${(f >= fPub && f < fPriv ? pulse : 1) * (f >= fPriv ? 0.7 : 1)})`, filter: f >= fPub && f < fPriv ? `drop-shadow(0 0 18px ${theme.accent})` : "none" }}>
                  <Icon name="Lock" size={96} color={f >= fPriv ? theme.muted : theme.accent} label="PUBLIC" />
                </div>
                <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.fg }}>{"+"}</div>
                <div style={{ transform: `scale(${f >= fPriv && f < fFriend ? 1.3 : 1})`, filter: f >= fPriv ? `drop-shadow(0 0 18px ${theme.accent3})` : "none" }}>
                  <Icon name="Key" size={96} color={theme.accent3} label="PRIVATE" />
                </div>
              </div>
              <Icon name="Laptop" size={150} color={theme.fg} label="YOU" />
              {f >= fPub && f < fPriv && <Pill text="SHARE WITH EVERYONE" color={theme.accent} />}
              {f >= fPriv && f < fFriend && <Pill text="NEVER SHARE" color={theme.accent3} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: on(fFriend), transform: `translateX(${friendIn}px)` }}>
              <div style={{ opacity: on(fFriend), transform: `scale(${pop(fFriend)})` }}>
                <Icon name="Lock" size={72} color={theme.accent} label="your lock" />
              </div>
              <Icon name="Laptop" size={150} color={theme.fg} label="FRIEND" />
            </div>
          </div>
          {f >= fBox && f < fEnd && (
            <div style={{ transform: `translateX(${shake}px) scale(${pop(fBox)})`, background: isOpen ? "#E6FFF4" : "#FFFFFF", border: `6px solid ${isOpen ? theme.good : locked ? theme.accent : theme.line}`, borderRadius: 24, padding: "14px 40px", display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
              <Icon name={locked ? "Lock" : "Unlock"} size={64} color={locked ? theme.accent : theme.good} />
              <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 76, color: "#0B1020" }}>{is42 ? "forty two / 42" : "seven / 7"}</div>
              {isOpen && <Icon name="Check" size={64} color={theme.good} />}
            </div>
          )}
          {showEyes && (
            <div style={{ opacity: on(fEyes), display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Icon name="Eye" size={54} color={theme.muted} />
              <Icon name="Eye" size={54} color={theme.muted} />
              <Icon name="Eye" size={54} color={theme.muted} />
              <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.muted }}>Everyone sees 42</div>
            </div>
          )}
          {f >= fKey && f < fOpen && (
            <div style={{ opacity: on(fKey), display: "flex", flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Icon name="Key" size={60} color={theme.accent3} />
              <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 50, color: theme.accent3 }}>{"plug in private key…".slice(0, Math.max(0, Math.min(19, f - fKey)))}</div>
            </div>
          )}
        </div>
      </Slot>
      <Arrow from={[300, 700]} to={[780, 700]} at={fFriend} outAt={fBox + 20} color={theme.accent} />
      <Arrow from={[700, 900]} to={[360, 900]} at={fKey} outAt={fOpen} color={theme.accent3} />
      {f >= fFriend && f < fBox + 20 && (
        <div style={{ position: "absolute", left: 300 + fly * 480 - 20, top: 690, width: 40, height: 40, borderRadius: 20, background: theme.accent, boxShadow: `0 0 16px ${theme.accent}` }} />
      )}
      {f >= fKey && f < fOpen && (
        <div style={{ position: "absolute", left: 700 - backFly * 340 - 20, top: 890, width: 40, height: 40, borderRadius: 20, background: theme.accent3, boxShadow: `0 0 16px ${theme.accent3}` }} />
      )}
      <Slot area="below" at={fEnd}>
        <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "stretch", opacity: on(fEnd) }}>
          <div style={{ background: "#0C2E22", border: `4px solid ${theme.good}`, borderRadius: 20, padding: "12px 22px", display: "flex", flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Icon name="Lock" size={56} color={theme.good} />
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 48, color: theme.fg }}>Locking = EASY</div>
          </div>
          <div style={{ background: "#2E0C14", border: `4px solid ${theme.bad}`, borderRadius: 20, padding: "12px 22px", display: "flex", flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Icon name="Shield" size={56} color={theme.bad} />
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 42, color: theme.fg }}>Unlocking w/o key ≈ HARD</div>
          </div>
        </div>
      </Slot>
    </Stage>
  );
}