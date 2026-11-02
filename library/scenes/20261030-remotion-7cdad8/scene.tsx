import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { theme, sec, ramp, Appear } from "@kit";

function Avatar({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <div style={{ position: "absolute", left: x - 90, top: y - 90, width: 180, height: 180, borderRadius: 90, background: color, display: "flex", alignItems: "center", justifyContent: "center", border: `8px solid ${theme.fg}`, boxShadow: `0 0 40px ${color}` }}>
      <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 42, color: "#0B1220" }}>{label}</div>
    </div>
  );
}

function GoldKey({ x, y, rot, glow, scale }: { x: number; y: number; rot: number; glow: number; scale: number }) {
  return (
    <div style={{ position: "absolute", left: x - 130 * scale, top: y - 60 * scale, width: 260 * scale, height: 120 * scale, transform: `rotate(${rot}deg)`, boxShadow: glow > 0 ? `0 0 ${20 + glow * 60}px ${theme.accent3}` : "none", borderRadius: 24, background: "transparent" }}>
      <div style={{ position: "absolute", left: 0, top: 10 * scale, width: 100 * scale, height: 100 * scale, borderRadius: 60 * scale, border: `${20 * scale}px solid ${theme.accent3}`, background: "transparent" }} />
      <div style={{ position: "absolute", left: 110 * scale, top: 46 * scale, width: 145 * scale, height: 28 * scale, background: theme.accent3, borderRadius: 10 * scale }} />
      <div style={{ position: "absolute", left: 200 * scale, top: 74 * scale, width: 22 * scale, height: 40 * scale, background: theme.accent3 }} />
      <div style={{ position: "absolute", left: 228 * scale, top: 74 * scale, width: 22 * scale, height: 30 * scale, background: theme.accent3 }} />
    </div>
  );
}

function PadLock({ x, y, s, open, color, glow }: { x: number; y: number; s: number; open: number; color: string; glow?: boolean }) {
  const shackleLift = open * 34 * s;
  return (
    <div style={{ position: "absolute", left: x - 60 * s, top: y - 70 * s, width: 120 * s, height: 150 * s, filter: glow ? `drop-shadow(0 0 18px ${color})` : "none" }}>
      <div style={{ position: "absolute", left: 15 * s, top: `${-10 * s - shackleLift}px`, width: 90 * s, height: 80 * s, borderRadius: `${45 * s}px ${45 * s}px 0 0`, border: `${14 * s}px solid ${color}`, borderBottom: "none", background: "transparent" }} />
      <div style={{ position: "absolute", left: 0, top: 60 * s, width: 120 * s, height: 90 * s, borderRadius: 18 * s, background: color, border: `5px solid ${theme.fg}` }} />
      <div style={{ position: "absolute", left: 48 * s, top: 82 * s, width: 24 * s, height: 24 * s, borderRadius: 14 * s, background: "#0B1220" }} />
      <div style={{ position: "absolute", left: 54 * s, top: 100 * s, width: 12 * s, height: 26 * s, background: "#0B1220" }} />
    </div>
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fBob = sec(0.41);
  const fPosts = sec(4.63);
  const fAlice = sec(6.37);
  const fSnaps = sec(9.67);
  const fCant = sec(12.03);
  const fTravel = sec(13.99);
  const fThieves = sec(15.89);
  const fBobArr = sec(18.09);
  const fTurns = sec(19.93);

  const bobSlide = interpolate(frame, [fBob, fBob + 20], [1250, 540], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toSide = ramp(frame, fAlice, 20);
  const bobX = bobSlide * (1 - toSide) + 860 * toSide;
  const bobY = 500 + Math.cos(frame * 0.08) * 8;

  const aliceX = interpolate(frame, [fAlice, fAlice + 20], [-320, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aliceY = 720 + Math.sin(frame * 0.08) * 10;

  const goldX = bobX - 140;
  const goldY = 920 + Math.sin(frame * 0.12) * 8;
  const bigLockX = bobX + 150;
  const bigLockY = 920 + Math.cos(frame * 0.12) * 8;
  const wig = Math.sin(frame * 0.2) * 9;

  const boardOp = ramp(frame, fPosts, 15);
  const boxX = interpolate(frame, [fTravel, fBobArr], [540, 760], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const boxY = 980;

  const cardAppear = ramp(frame, fAlice, 12);
  const cardDropY = interpolate(frame, [fSnaps, fSnaps + 15], [620, 970], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardDropOp = interpolate(frame, [fSnaps + 15, fSnaps + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardDropVis = cardAppear * (frame < fSnaps + 15 ? 1 : cardDropOp);

  const closed1 = ramp(frame, fSnaps + 5, 12);
  const reopen = ramp(frame, fTurns + 10, 12);
  const lidClosed = closed1 * (1 - reopen);

  const flyBox = ramp(frame, fSnaps + 10, 15);
  const boxLockX = 540 * (1 - flyBox) + boxX * flyBox;
  const boxLockY = interpolate(frame, [fSnaps + 10, fSnaps + 25], [560, 1075], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shackleShut = ramp(frame, fSnaps + 20, 8);
  const popOpen = ramp(frame, fTurns + 8, 10);
  const boxLockClosedAmt = shackleShut * (1 - popOpen);
  const boxLockOpen = 1 - boxLockClosedAmt;

  const shakeEnv = ramp(frame, fCant, 10) * (1 - ramp(frame, fCant + 30, 10));
  const shakeX = Math.sin((frame - fCant) * 0.9) * 16 * shakeEnv;
  const lockGrey = ramp(frame, fCant + 10, 12);
  const lockColor = lockGrey < 0.5 ? "#CBD5E1" : theme.muted;

  const redXSpring = spring({ frame: Math.max(0, frame - (fCant + 12)), fps, config: { damping: 14 } });
  const redXOp = ramp(frame, fCant + 12, 6) * (1 - ramp(frame, fTurns, 12));

  const wireOp = ramp(frame, fTravel, 15) * (1 - ramp(frame, fBobArr + 10, 15) * 0.4);
  const dotOff = (frame * 11) % 70;

  const lunge = ramp(frame, fThieves, 12) * (1 - ramp(frame, fThieves + 42, 14));
  const pickRot = interpolate(frame, [fThieves + 10, fThieves + 22], [0, 55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pickFall = ramp(frame, fThieves + 18, 15) * 220;
  const sparkOp = ramp(frame, fThieves + 20, 3) * (1 - ramp(frame, fThieves + 30, 10));

  const keyGlow = ramp(frame, fBobArr, 12) + ramp(frame, fTurns, 10) * 1.2;
  const keyRot = interpolate(frame, [fTurns, fTurns + 20], [0, 90], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const insert = ramp(frame, fTurns, 12);
  const keyTurnX = goldX * (1 - insert) + (boxLockX - 110) * insert;
  const keyTurnY = goldY * (1 - insert) + (boxLockY - 10) * insert;

  const jumpOp = ramp(frame, fTurns + 12, 8);
  const jumpY = interpolate(frame, [fTurns + 12, fTurns + 34], [970, 480], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jumpSpring = spring({ frame: Math.max(0, frame - (fTurns + 12)), fps, config: { damping: 14 } });
  const jumpScale = 1 + jumpSpring * 0.35;

  let headline = "Bob's Two Keys";
  if (frame >= fTurns) headline = "Turns — 42 Comes Out!";
  else if (frame >= fBobArr) headline = "Only Bob's Key Fits";
  else if (frame >= fThieves) headline = "Thieves Can't Pick It";
  else if (frame >= fTravel) headline = "Travels the Internet";
  else if (frame >= fCant) headline = "Even She Can't Reopen";
  else if (frame >= fSnaps) headline = "Snaps Shut!";
  else if (frame >= fAlice) headline = "Alice Sends 42";
  else if (frame >= fPosts) headline = "Posts Lock for EVERYONE";

  const headOp = ramp(frame, fBob, 12);

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {/* headline band 192-420 */}
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", opacity: headOp }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg, lineHeight: 1.05, padding: "0 60px" }}>{headline}</div>
        <div style={{ margin: "14px auto 0", width: 320, height: 10, borderRadius: 5, background: theme.accent }} />
      </div>

      {/* bulletin board */}
      <div style={{ position: "absolute", left: 180, top: 445, width: 720, height: 250, borderRadius: 28, background: "#141E32", border: `6px solid ${theme.fg}`, opacity: boardOp, transform: `scale(${1 + ramp(frame, fPosts, 15) * 0.04})` }}>
        <div style={{ textAlign: "center", fontFamily: theme.font, fontWeight: 900, fontSize: 54, color: theme.fg, marginTop: 14, letterSpacing: 4 }}>EVERYONE</div>
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const slotX = 340 + (i % 3) * 200;
        const slotY = 585 + Math.floor(i / 3) * 80;
        const p = ramp(frame, fPosts + i * 6, 18);
        const sx = 680;
        const sy = 920;
        const fx = sx + (slotX - sx) * p;
        const fy = sy + (slotY - sy) * p - Math.sin(p * Math.PI) * 160;
        if (p <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: fx - 30, top: fy - 35, width: 60, height: 75, opacity: p }}>
            <div style={{ position: "absolute", left: 8, top: -6, width: 44, height: 36, borderRadius: "22px 22px 0 0", border: `7px solid #CBD5E1`, borderBottom: "none" }} />
            <div style={{ position: "absolute", left: 0, top: 28, width: 60, height: 45, borderRadius: 9, background: "#CBD5E1", border: "3px solid #fff" }} />
          </div>
        );
      })}

      {/* internet wire */}
      <div style={{ position: "absolute", left: 60, top: 1090, width: 960, opacity: wireOp }}>
        <div style={{ width: "100%", borderTop: "10px dotted #64748B" }} />
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: i * 68 - dotOff, top: -24, width: 22, height: 22, borderRadius: 11, background: theme.accent, opacity: 0.9 }} />
        ))}
        <div style={{ textAlign: "center", fontFamily: theme.mono, fontSize: 40, color: theme.muted, marginTop: 18, fontWeight: 800 }}>— INTERNET —</div>
      </div>

      {/* cardboard box */}
      <div style={{ position: "absolute", left: boxX - 160, top: boxY - 130, width: 320, height: 250, opacity: ramp(frame, fAlice, 12) }}>
        {/* open flaps */}
        <div style={{ position: "absolute", left: -46, top: -58, width: 90, height: 90, background: "#8A5A24", transform: "rotate(-28deg)", opacity: 1 - lidClosed, border: "4px solid #5C3A12" }} />
        <div style={{ position: "absolute", right: -46, top: -58, width: 90, height: 90, background: "#8A5A24", transform: "rotate(28deg)", opacity: 1 - lidClosed, border: "4px solid #5C3A12" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 320, height: 230, background: "#C88A3A", borderRadius: 18, border: "6px solid #5C3A12" }} />
        <div style={{ position: "absolute", left: 148, top: 0, width: 24, height: 230, background: "#8A5A24", opacity: 0.7 }} />
        {/* closed lid */}
        <div style={{ position: "absolute", left: -10, top: -34, width: 340, height: 60, background: "#E0A94E", borderRadius: 14, border: "6px solid #5C3A12", opacity: lidClosed }} />
        <div style={{ position: "absolute", left: 40, top: 80, width: 240, height: 70, borderRadius: 14, background: "rgba(0,0,0,0.18)", border: "4px dashed rgba(255,255,255,0.5)" }} />
      </div>

      {/* dropping card 42 */}
      {cardDropVis > 0 && (
        <div style={{ position: "absolute", left: boxX - 100, top: cardDropY - 70, width: 200, height: 140, borderRadius: 18, background: theme.fg, border: `6px solid ${theme.accent2}`, opacity: cardDropVis, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${theme.accent2}` }}>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: "#0B1220" }}>42</div>
        </div>
      )}
      {/* jumping glowing card */}
      {jumpOp > 0 && (
        <div style={{ position: "absolute", left: boxX - 110 * jumpScale, top: jumpY - 75 * jumpScale, width: 220 * jumpScale, height: 150 * jumpScale, borderRadius: 20, background: "#FFFFFF", border: `8px solid ${theme.accent3}`, opacity: jumpOp, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${40 + 60 * jumpOp}px ${theme.accent3}` }}>
          <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 104, color: "#0B1220" }}>42</div>
        </div>
      )}

      {/* chain between gold key and big lock */}
      {frame >= fBob && frame < fTurns + 2 && (
        <div style={{ position: "absolute", left: Math.min(goldX + 130, bigLockX - 60), top: 912, width: Math.abs(bigLockX - goldX - 190) + 60, height: 16, background: theme.accent, borderRadius: 8, boxShadow: `0 0 24px ${theme.accent}`, transform: `rotate(${wig}deg)`, opacity: ramp(frame, fBob, 10) }} />
      )}

      {/* big gold key + big silver lock (Bob's pair) */}
      {frame >= fBob && (
        <>
          <GoldKey x={frame >= fTurns ? keyTurnX : goldX} y={frame >= fTurns ? keyTurnY : goldY} rot={frame >= fTurns ? keyRot : wig * 0.6} glow={keyGlow} scale={frame >= fBobArr ? 1.15 : 1} />
          <PadLock x={bigLockX} y={bigLockY} s={1.15} open={0.1} color="#CBD5E1" glow />
        </>
      )}

      {/* box front lock */}
      {flyBox > 0 && (
        <div style={{ transform: `translateX(${shakeX}px)` }}>
          <PadLock x={boxLockX} y={boxLockY} s={0.95} open={boxLockOpen} color={lockColor} glow={sparkOp > 0} />
        </div>
      )}

      {/* avatars */}
      {frame >= fBob && <Avatar x={bobX} y={bobY} color={theme.accent} label="BOB" />}
      {frame >= fAlice && <Avatar x={aliceX} y={aliceY} color={theme.accent2} label="ALICE" />}

      {/* thief eyes */}
      {frame >= fThieves && frame < fBobArr + 10 && (
        <>
          <div style={{ position: "absolute", left: 300 - lunge * 60, top: 780, width: 150, height: 100, borderRadius: 75, background: "#0B1220", border: "6px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 110, height: 62, borderRadius: 55, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: "#000" }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 630 + lunge * 60, top: 780, width: 150, height: 100, borderRadius: 75, background: "#0B1220", border: "6px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 110, height: 62, borderRadius: 55, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: "#000" }} />
            </div>
          </div>
          {/* lock picks snapping */}
          <div style={{ position: "absolute", left: 440, top: 960 - pickFall * 0.4, width: 14, height: 150, background: "#E2E8F0", transform: `rotate(${-30 - pickRot}deg)`, borderRadius: 7 }} />
          <div style={{ position: "absolute", left: 640, top: 960 - pickFall * 0.4, width: 14, height: 150, background: "#E2E8F0", transform: `rotate(${30 + pickRot}deg)`, borderRadius: 7 }} />
          {sparkOp > 0 && (
            <div style={{ position: "absolute", left: boxX - 90, top: 990, fontSize: 130, color: theme.accent3, opacity: sparkOp, fontWeight: 900, textShadow: `0 0 30px ${theme.accent3}` }}>✦</div>
          )}
          <Appear at={sec(15.89)} outAt={sec(18.09)} style={{ position: "absolute", top: 1210, width: "100%", textAlign: "center" }}>
            <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 64, color: "#EF4444" }}>CAN'T PICK IT!</div>
          </Appear>
        </>
      )}

      {/* red X for can't reopen */}
      {redXOp > 0 && (
        <div style={{ position: "absolute", left: boxX - 80 * redXSpring, top: 990 - 80 * redXSpring, width: 160 * redXSpring, height: 160 * redXSpring, opacity: redXOp }}>
          <div style={{ position: "absolute", left: 70, top: 0, width: 20, height: 170, background: "#EF4444", transform: "rotate(45deg)", borderRadius: 10 }} />
          <div style={{ position: "absolute", left: 70, top: 0, width: 20, height: 170, background: "#EF4444", transform: "rotate(-45deg)", borderRadius: 10 }} />
        </div>
      )}
    </AbsoluteFill>
  );
}