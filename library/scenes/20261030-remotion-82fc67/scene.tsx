import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme, sec } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();

  const F0 = sec(0.24);
  const F1 = sec(1.78);
  const F2 = sec(3.26);
  const F3 = sec(4.3);
  const F4 = sec(5.74);

  const slide = interpolate(frame, [F0, F0 + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const senderTx = interpolate(slide, [0, 1], [-560, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const receiverTx = interpolate(slide, [0, 1], [560, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slideOp = interpolate(frame, [F0, F0 + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wireDraw = interpolate(frame, [F0, sec(1.1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eyeIn = interpolate(frame, [F1, F1 + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const keyProg = interpolate(frame, [F2, F3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const keyY = interpolate(keyProg, [0, 1], [620, 862], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const keyIn = interpolate(frame, [F2, F2 + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const grab = interpolate(frame, [F3, F3 + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breakProg = interpolate(frame, [F4, F4 + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isGrabbed = frame >= F3;
  const isBroken = frame >= F4;

  const shakeX = isGrabbed && !isBroken ? Math.sin(frame * 1.4) * 16 * grab : 0;
  const shakeR = isGrabbed && !isBroken ? Math.sin(frame * 1.1) * 10 * grab : 0;

  const sA = Math.sin(frame * 0.19);
  const sB = Math.sin(frame * 0.19 + 2.1);
  const sC = Math.sin(frame * 0.19 + 4.2);
  const blinkA = interpolate(sA, [0.9, 1], [1, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blinkB = interpolate(sB, [0.9, 1], [1, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blinkC = interpolate(sC, [0.9, 1], [1, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const midScale = 1 + grab * 0.75;
  const midColor = isGrabbed ? theme.accent2 : theme.muted;
  const eyeColorSide = theme.muted;

  const pulse = 0.3 + 0.28 * (0.5 + 0.5 * Math.sin(frame * 0.22));
  const dashOffset = -frame * 2.2;

  const keyFlash = isGrabbed ? (Math.floor(frame / 4) % 2 === 0 ? "#FF2E2E" : theme.accent3) : theme.accent3;
  const keyGlowSize = 26 + 14 * Math.sin(frame * 0.35) + (isGrabbed ? 26 : 0);
  const keyGlowColor = isGrabbed ? "#FF2E2E" : theme.accent3;

  const fullQ = "how do strangers send secrets?";
  const typedCount = Math.max(
    0,
    Math.min(fullQ.length, Math.floor((frame - F4) / 2) + 1)
  );
  const typedText = fullQ.slice(0, frame >= F4 ? typedCount : 0);
  const cursorOp = frame >= F4 ? (Math.floor(frame / 8) % 2 === 0 ? 1 : 0) : 0;

  const split = interpolate(breakProg, [0, 1], [0, 58], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeQ = interpolate(frame, [F4, F4 + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eye = (
    cx: number,
    cy: number,
    scaleY: number,
    scale: number,
    color: string,
    op: number,
    glow: boolean
  ) => (
    <div
      style={{
        position: "absolute",
        left: cx - 65,
        top: cy - 40,
        width: 130,
        height: 80,
        opacity: op,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 130,
          height: 80,
          transform: `scaleY(${scaleY})`,
          border: `7px solid ${color}`,
          borderRadius: "70px / 48px",
          background: "#101826",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: glow
            ? `0 0 34px ${color}, inset 0 0 18px rgba(255,45,200,0.35)`
            : `0 0 14px rgba(0,0,0,0.6)`,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: color,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 12,
            height: 12,
            borderRadius: 6,
            background: "#fff",
            marginLeft: 12,
            marginTop: -12,
          }}
        />
      </div>
      {glow && (
        <div
          style={{
            position: "absolute",
            left: 55,
            top: 74,
            width: 20,
            height: 34,
            background: color,
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            opacity: 0.95,
          }}
        />
      )}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {/* vertical dashed wire track */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 710,
          width: 1080,
          height: 330,
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 528,
            top: 0,
            width: 24,
            height: 330,
            borderRadius: 12,
            background: theme.accent,
            opacity: eyeIn * pulse * 0.35,
            filter: "blur(14px)",
          }}
        />
        <svg width="40" height="330" style={{ overflow: "visible" }}>
          <line
            x1="20"
            y1="0"
            x2="20"
            y2={330 * wireDraw}
            stroke={theme.accent}
            strokeWidth={8}
            strokeDasharray="20 16"
            strokeLinecap="round"
            strokeDashoffset={dashOffset}
            opacity={0.95}
          />
        </svg>
      </div>

      {/* SENDER laptop */}
      <div
        style={{
          position: "absolute",
          left: 350,
          top: 430,
          width: 380,
          opacity: slideOp,
          transform: `translateX(${senderTx})`,
        }}
      >
        <div
          style={{
            width: 380,
            height: 218,
            border: `10px solid ${theme.fg}`,
            borderRadius: 26,
            background: "#0D1626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 92, lineHeight: 1 }}>💻</div>
        </div>
        <div
          style={{
            width: 420,
            height: 22,
            marginLeft: -20,
            marginTop: -2,
            borderRadius: 8,
            background: theme.fg,
          }}
        />
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 50,
            letterSpacing: 6,
            color: theme.fg,
          }}
        >
          SENDER
        </div>
      </div>

      {/* RECEIVER laptop */}
      <div
        style={{
          position: "absolute",
          left: 350,
          top: 1030,
          width: 380,
          opacity: slideOp,
          transform: `translateX(${receiverTx})`,
        }}
      >
        <div
          style={{
            width: 380,
            height: 218,
            border: `10px solid ${theme.fg}`,
            borderRadius: 26,
            background: "#0D1626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 92, lineHeight: 1 }}>💻</div>
        </div>
        <div
          style={{
            width: 420,
            height: 22,
            marginLeft: -20,
            marginTop: -2,
            borderRadius: 8,
            background: theme.fg,
          }}
        />
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 50,
            letterSpacing: 6,
            color: theme.fg,
          }}
        >
          RECEIVER
        </div>
      </div>

      {/* three snooping eyes */}
      {eye(318, 758, blinkA, 1, eyeColorSide, eyeIn, false)}
      {eye(762, 862, blinkB, midScale, midColor, eyeIn, isGrabbed)}
      {eye(318, 968, blinkC, 1, eyeColorSide, eyeIn, false)}

      {/* travelling secret key */}
      {!isBroken ? (
        <div
          style={{
            position: "absolute",
            left: 540 - 52,
            top: keyY - 52,
            width: 104,
            height: 104,
            opacity: keyIn,
            transform: `translateX(${shakeX}px) rotate(${shakeR}deg)`,
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 22,
              background: "#111A2E",
              border: `5px solid ${keyFlash}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 ${keyGlowSize}px ${keyGlowColor}`,
            }}
          >
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="22" cy="22" r="13" fill="none" stroke={keyFlash} strokeWidth="7" />
              <circle cx="22" cy="22" r="4" fill={keyFlash} />
              <line x1="31" y1="31" x2="58" y2="58" stroke={keyFlash} strokeWidth="8" strokeLinecap="round" />
              <line x1="48" y1="48" x2="48" y2="38" stroke={keyFlash} strokeWidth="7" strokeLinecap="round" />
              <line x1="56" y1="56" x2="56" y2="46" stroke={keyFlash} strokeWidth="7" strokeLinecap="round" />
            </svg>
          </div>
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              fontFamily: theme.mono,
              fontWeight: 800,
              fontSize: 34,
              color: keyFlash,
              letterSpacing: 2,
            }}
          >
            KEY
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            opacity: 1,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 540 - 52 - split,
              top: 862 - 52 - split * 0.7,
              width: 104,
              height: 60,
              borderRadius: 20,
              background: "#111A2E",
              border: "5px solid #FF2E2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${-24 * breakProg}deg)`,
              boxShadow: "0 0 40px #FF2E2E",
            }}
          >
            <div
              style={{
                width: 44,
                height: 26,
                border: "7px solid #FF2E2E",
                borderRadius: 18,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 540 - 20 + split,
              top: 862 + 10 + split * 0.7,
              width: 80,
              height: 60,
              borderRadius: 16,
              background: "#111A2E",
              border: "5px solid #FF2E2E",
              transform: `rotate(${30 * breakProg}deg)`,
              boxShadow: "0 0 32px #FF2E2E",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 22,
                width: 50,
                height: 9,
                background: "#FF2E2E",
                borderRadius: 5,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 540 - 90,
              top: 940,
              width: 180,
              textAlign: "center",
              fontFamily: theme.font,
              fontWeight: 900,
              fontSize: 52,
              color: "#FF2E2E",
            }}
          >
            STOLEN
          </div>
        </div>
      )}

      {/* late question text */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 208,
          width: 1080,
          minHeight: 190,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: fadeQ,
        }}
      >
        <div
          style={{
            width: 920,
            textAlign: "center",
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 86,
            lineHeight: 1.05,
            color: theme.fg,
          }}
        >
          {typedText}
          <span style={{ opacity: cursorOp, color: theme.accent3 }}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}