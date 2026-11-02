import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../../theme";
import { ease, useSpringAt } from "../anim";

/**
 * Named layout regions that respect the caption band (y ≥ 1440) and the IG chrome. Putting content into
 * slots instead of free pixels is what prevents overlaps: each region holds ONE focal group.
 *
 *   title  y 200–440   headline
 *   main   y 460–1180  the diagram / data structure
 *   below  y 1190–1400 secondary info (variables, a note, a code line)
 */
export const LAYOUT = {
  title: { top: 200, height: 240 },
  main: { top: 460, height: 720 },
  below: { top: 1190, height: 210 },
  left: 80,
  right: 1000,
  centerX: 540,
} as const;

type Area = keyof Pick<typeof LAYOUT, "title" | "main" | "below">;

/** Places children in a layout region, fading/sliding in at `at` and out at `outAt`. */
export const Slot: React.FC<{ area: Area; at?: number; outAt?: number; children: React.ReactNode; align?: "center" | "start"; style?: React.CSSProperties }> = ({
  area,
  at = 0,
  outAt,
  children,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const r = LAYOUT[area];
  const inP = ease(frame, at, 12);
  const outP = outAt === undefined ? 0 : ease(frame, outAt, 10);
  const o = inP * (1 - outP);
  if (o <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        top: r.top,
        height: r.height,
        left: 0,
        width: 1080,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        opacity: o,
        transform: `translateY(${(1 - inP) * 30 - outP * 20}px)`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Background + optional headline in the title slot. Put everything else in <Slot>s inside. */
export const Stage: React.FC<{ title?: string; titleAt?: number; titleOutAt?: number; kicker?: string; children?: React.ReactNode; bg?: string }> = ({
  title,
  titleAt = 0,
  titleOutAt,
  kicker,
  children,
  bg = theme.bg,
}) => {
  const s = useSpringAt(titleAt);
  return (
    <AbsoluteFill style={{ background: bg }}>
      {title && (
        <Slot area="title" at={titleAt} outAt={titleOutAt}>
          {kicker && (
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 34, letterSpacing: 4, textTransform: "uppercase", color: theme.accent, marginBottom: 14 }}>
              {kicker}
            </div>
          )}
          <div
            style={{
              fontFamily: theme.font,
              fontWeight: 900,
              fontSize: title.length > 22 ? 76 : 92,
              lineHeight: 1.05,
              color: theme.fg,
              textAlign: "center",
              padding: "0 70px",
              transform: `scale(${0.85 + 0.15 * s})`,
            }}
          >
            {title}
          </div>
        </Slot>
      )}
      {children}
    </AbsoluteFill>
  );
};
