You write a single Remotion (React + TypeScript) scene for a vertical 1080x1920, 30fps Reel. Return ONE ```tsx code block and nothing else.

Hard rules (the code is statically checked and rejected otherwise):
- `export default` a React component taking no props. It is rendered as a composition whose length is the segment duration.
- Imports allowed ONLY from: "react", "remotion", "@kit"{{THREE_IMPORTS}}. No other files, no CSS files, no images/fonts/URLs.
- ALL animation must be a pure function of `useCurrentFrame()` (via `interpolate`, `spring`, or the kit helpers). Never use setTimeout/setInterval/requestAnimationFrame, Date, Math.random (use `random("seed")` from remotion), CSS animations/transitions/@keyframes, or state/effects for timing.
- Convert beat times to frames with `sec(t)` from "@kit" (= Math.round(t*30)). Each beat's visual change must START at its frame.
- Always clamp interpolations: `interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })`.
- Root element: `<Stage title?="…">` from "@kit", with content inside `<Slot area="main" | "below">`. Never place a diagram by raw pixel coordinates when a Slot can hold it. Captions are drawn below y=1440 later — do NOT render subtitles/narration text yourself.
- Use big type: body ≥ 48px, headings 80–110px, weight 800–900, `fontFamily: theme.font`. Max ~3 short lines of text on screen at once.
- `spring({ frame, fps, config: { damping: 14 } })` — damping goes inside `config`. Get `fps` from `useVideoConfig()`.
- TypeScript strictness: use `import type { ... }` for type-only imports. In JSX, wrap raw arrow text as `{"->"}` (a bare `->` crashes the bundler).
- Never put text behind/over a 3D object or another element: give titles their own band (e.g. top 192–420px) and keep 3D content away from it.
- Never leave the screen static for more than ~1.5s.
- COMPOSE, DON'T DRAW: if a `@kit` component exists for the thing (array, pointers, window, DP table, list, tree, graph, stack, queue, map, code, icon, arrow, chart, timeline…), you MUST use it and express the animation as its `steps` data. Hand-written SVG/divs only for things no component covers.
- Keep it short: aim for under ~120 lines. No comments, no unused helpers.
- LAYOUT CONTRACT (overlaps are the #1 quality killer — obey literally): ONE focal group on screen at a time; fade the previous group OUT before the next fades in. Never draw an icon, badge, or glow ON TOP of text — labels get clear padding on all sides (a lock goes BELOW or BESIDE its label, never covering it). Keep every diagram element above y=1300: captions live below, and anything drifting lower will collide with them. Max 3 labeled elements per beat; titles ≤ 6 words. Body text only in near-white, emphasis only in the two accent colors — never mid-gray text on dark, it melts into the scene.

House components from "@kit" (tested; they handle layout, colours, sizing and animation):

{{KIT}}

Example (shape only — a two-pointer walkthrough in ~30 lines):
```tsx
import React from "react";
import { ArrayView, Slot, Stage, VarWatch, sec } from "@kit";

export default function Scene() {
  return (
    <Stage title="Squeeze from both ends" kicker="LeetCode 167">
      <Slot area="main">
        <ArrayView
          label="numbers"
          values={[1, 2, 4, 5, 7, 11]}
          steps={[
            { at: sec(0.4), pointers: { l: 0, r: 5 }, mark: { 0: "compare", 5: "compare" }, note: "1 + 11 = 12 > 9" },
            { at: sec(1.9), pointers: { r: 4 }, mark: { 0: "compare", 4: "compare", 5: "dim" }, note: "too big → move r" },
            { at: sec(3.3), pointers: { l: 1 }, mark: { 1: "found", 4: "found", 0: "dim", 5: "dim" }, window: [1, 4], note: "2 + 7 = 9 ✓" },
          ]}
        />
      </Slot>
      <Slot area="below" at={sec(0.4)}>
        <VarWatch vars={{ target: 9 }} steps={[{ at: sec(0.4), vars: { sum: 12 } }, { at: sec(1.9), vars: { sum: 8 } }, { at: sec(3.3), vars: { sum: 9 } }]} />
      </Slot>
    </Stage>
  );
}
```
