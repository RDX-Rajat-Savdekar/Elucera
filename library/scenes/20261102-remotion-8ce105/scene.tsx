import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { theme, sec, Appear } from "@kit";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 14 } });
  const popScale = interpolate(pop, [0, 1], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const doesntSpring = spring({
    frame: Math.max(0, frame - sec(0.86)),
    fps,
    config: { damping: 14 },
  });
  const doesntScale = interpolate(doesntSpring, [0, 1], [2.2, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalSpring = spring({
    frame: Math.max(0, frame - sec(3.58)),
    fps,
    config: { damping: 14 },
  });
  const finalScale = interpolate(finalSpring, [0, 1], [2.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Water rises 1.48s -> 2.6s from 0 to middle
  const waterP = interpolate(frame, [sec(1.48), sec(2.6)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wobble = Math.sin(frame / 6) * 8 * waterP;
  const waterH = waterP * 280 + wobble * 0.3;

  // Dots fall 1.48 -> 2.96 into pitcher mouth (y 520 -> 860)
  const fallP1 = interpolate(frame, [sec(1.48), sec(2.96)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fallP2 = interpolate(frame, [sec(1.62), sec(2.96)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotY1 = interpolate(fallP1, [0, 1], [520, 830], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotY2 = interpolate(fallP2, [0, 1], [500, 860], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const prePop1 = interpolate(frame, [sec(2.7), sec(2.96)], [1, 1.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const prePop2 = interpolate(frame, [sec(2.75), sec(2.96)], [1, 1.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showDots = frame < sec(2.96);
  const flashOp = interpolate(frame, [sec(2.96), sec(3.2)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flashScale = interpolate(frame, [sec(2.96), sec(3.2)], [0.6, 2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showFlash = frame >= sec(2.96) && frame < sec(3.3);

  const streamOp = interpolate(frame, [sec(1.48), sec(1.7)], [0, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streamOff = interpolate(frame, [sec(2.96), sec(3.1)], [0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streamOpacity = showDots ? streamOp : streamOff;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {/* TITLE 1 : YOUR BRITA */}
      <Appear
        at={0}
        outAt={sec(0.6)}
        dy={0}
        style={{ position: "absolute", top: 230, width: "100%", alignItems: "center" }}
      >
        <div
          style={{
            alignSelf: "center",
            marginLeft: "auto",
            marginRight: "auto",
            width: 860,
            textAlign: "center",
            background: "#151927",
            borderRadius: 999,
            paddingTop: 28,
            paddingBottom: 28,
            color: "#FFFFFF",
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 88,
            letterSpacing: 2,
            border: `4px solid ${theme.fg}`,
          }}
        >
          YOUR BRITA
        </div>
      </Appear>

      {/* TITLE 2 : DOESN'T */}
      <Appear
        at={sec(0.86)}
        outAt={sec(3.3)}
        dy={60}
        style={{ position: "absolute", top: 240, width: "100%", alignItems: "center" }}
      >
        <div
          style={{
            transform: `scale(${doesntScale})`,
            marginLeft: "auto",
            marginRight: "auto",
            width: 760,
            textAlign: "center",
            background: "#151927",
            borderRadius: 999,
            paddingTop: 24,
            paddingBottom: 24,
            color: theme.accent2,
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 96,
            border: `4px solid ${theme.accent2}`,
          }}
        >
          DOESN&apos;T
        </div>
      </Appear>

      {/* TITLE 3 : KIDNAPS FLAVOR */}
      <Appear
        at={sec(3.58)}
        dy={60}
        style={{ position: "absolute", top: 240, width: "100%", alignItems: "center" }}
      >
        <div
          style={{
            transform: `scale(${finalScale})`,
            marginLeft: "auto",
            marginRight: "auto",
            width: 920,
            textAlign: "center",
            background: "#151927",
            borderRadius: 48,
            paddingTop: 26,
            paddingBottom: 26,
            paddingLeft: 20,
            paddingRight: 20,
            color: theme.accent3,
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 84,
            lineHeight: 1.05,
            border: `5px solid ${theme.accent3}`,
          }}
        >
          KIDNAPS FLAVOR
        </div>
      </Appear>

      {/* POUR STREAM */}
      <div
        style={{
          position: "absolute",
          left: 528,
          top: 500,
          width: 24,
          height: 170,
          background: theme.accent,
          opacity: streamOpacity,
          borderRadius: 12,
        }}
      />

      {/* FALLING IMPURITIES */}
      {showDots && frame >= sec(1.48) ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 498,
              top: dotY1,
              width: 56,
              height: 56,
              borderRadius: 28,
              background: theme.good,
              transform: `scale(${prePop1})`,
              boxShadow: `0 0 28px ${theme.good}`,
              border: "4px solid #FFFFFF",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 562,
              top: dotY2,
              width: 52,
              height: 52,
              borderRadius: 26,
              background: theme.accent3,
              transform: `scale(${prePop2})`,
              boxShadow: `0 0 28px ${theme.accent3}`,
              border: "4px solid #FFFFFF",
            }}
          />
        </>
      ) : null}

      {/* FLASH ON VANISH */}
      {showFlash ? (
        <div
          style={{
            position: "absolute",
            left: 540 - 70 * flashScale,
            top: 845 - 70 * flashScale,
            width: 140 * flashScale,
            height: 140 * flashScale,
            borderRadius: 999,
            background: "#FFFFFF",
            opacity: flashOp,
            border: `6px solid ${theme.accent3}`,
          }}
        />
      ) : null}

      {/* PITCHER */}
      <div
        style={{
          position: "absolute",
          left: 290,
          top: 670,
          width: 500,
          height: 560,
          transform: `scale(${popScale})`,
        }}
      >
        {/* body outline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 40,
            width: 380,
            height: 520,
            border: `12px solid ${theme.muted}`,
            borderTopWidth: 14,
            borderRadius: 24,
            borderBottomLeftRadius: 90,
            borderBottomRightRadius: 90,
            background: "rgba(255,255,255,0.04)",
          }}
        />
        {/* spout */}
        <div
          style={{
            position: "absolute",
            left: -6,
            top: 10,
            width: 120,
            height: 80,
            border: `12px solid ${theme.muted}`,
            borderBottomWidth: 0,
            borderRightWidth: 0,
            borderTopLeftRadius: 24,
          }}
        />
        {/* handle */}
        <div
          style={{
            position: "absolute",
            left: 370,
            top: 120,
            width: 130,
            height: 280,
            border: `12px solid ${theme.muted}`,
            borderLeftWidth: 0,
            borderTopRightRadius: 80,
            borderBottomRightRadius: 80,
          }}
        />
        {/* water fill */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 52,
            width: 356,
            height: 496,
            overflow: "hidden",
            borderBottomLeftRadius: 78,
            borderBottomRightRadius: 78,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: Math.max(0, waterH),
              background: theme.accent,
              opacity: 0.9,
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
            }}
          />
        </div>
        {/* water label below pitcher, clear padding */}
        <div
          style={{
            position: "absolute",
            top: 585,
            width: 500,
            textAlign: "center",
            color: theme.fg,
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 48,
            opacity: interpolate(frame, [sec(1.48), sec(1.9)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          WATER
        </div>
      </div>

      {/* MESH ICON CROSSED OUT - beside pitcher, never over text */}
      <Appear
        at={sec(0.86)}
        outAt={sec(3.3)}
        dy={20}
        style={{ position: "absolute", left: 800, top: 940, width: 220, height: 220 }}
      >
        <div style={{ position: "relative", width: 200, height: 200 }}>
          <div
            style={{
              position: "absolute",
              left: 30,
              top: 30,
              width: 140,
              height: 100,
              border: `8px solid ${theme.fg}`,
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 30,
                width: "100%",
                height: 6,
                background: theme.fg,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 60,
                width: "100%",
                height: 6,
                background: theme.fg,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 45,
                top: 0,
                width: 6,
                height: "100%",
                background: theme.fg,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 85,
                top: 0,
                width: 6,
                height: "100%",
                background: theme.fg,
                opacity: 0.9,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 88,
              width: 180,
              height: 18,
              background: "#FF3B30",
              borderRadius: 9,
              transform: "rotate(32deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 88,
              width: 180,
              height: 18,
              background: "#FF3B30",
              borderRadius: 9,
              transform: "rotate(-32deg)",
            }}
          />
          <div
            style={{
              marginTop: 160,
              textAlign: "center",
              color: theme.fg,
              fontFamily: theme.font,
              fontWeight: 800,
              fontSize: 42,
            }}
          >
            NO STRAIN
          </div>
        </div>
      </Appear>
    </AbsoluteFill>
  );
}