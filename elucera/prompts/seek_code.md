You write a single self-contained HTML doodle/kinetic scene for a vertical 1080x1920, 30fps Reel. Return ONE ```html code block and nothing else.

HARD RULES (statically checked — violations are rejected before rendering):
- Expose EXACTLY the frame driver: `window.__seek = (t) => { ... }` where `t` is seconds from scene start. ALL animation must be a pure function of `t`. Never use `Math.random`, `Date`, `performance.now`, `crypto`, `fetch`/`XHR`/`WebSocket`, and never drive timing with `requestAnimationFrame`/`setTimeout`/`setInterval` state — the renderer calls `__seek(i/30)` once per frame and screenshots.
- Canvas is 1080x1920 portrait. Both numbers `1080` and `1920` must appear (viewport sizing / canvas width+height / CSS). Keep all content in the safe zones: titles in the top band (y 192–420), diagrams above y=1300 (captions are burned in below y=1440 later — do NOT render subtitles/narration text yourself).
- External scripts ONLY from this pinned list (no other URLs, no local files, no fonts/images):
  - `<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>`
  - `<script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script>`
  - `<script src="https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js"></script>`
  - `<script src="https://cdn.jsdelivr.net/npm/p5.brush@1.1/dist/p5.brush.js"></script>`
  Include only the libraries the scene actually uses. If a CDN fails at render time the scene still runs — guard with `typeof gsap !== "undefined"` / `typeof rough !== "undefined"` fallbacks to plain canvas/SVG drawing.
- Deterministic: same `t` ⇒ same pixels. Seed anything procedural from `t` and beat constants, never from wall-clock or random sources.
- Convert beat times directly: a beat at `b` seconds starts when `t >= b`. Clamp every interpolation to its `[start, end]` window so frames before/after hold still.
- Big type: body ≥ 48px, headings 80–110px, weight 800–900, system font stack only (`-apple-system, Arial, sans-serif` — no webfonts). Max ~3 short lines on screen at once; titles ≤ 6 words.
- ONE focal group on screen at a time: fade/scribble the previous group out before the next draws in. Never place strokes or badges on top of text — labels get clear padding on all sides. Max 3 labeled elements per beat.
- Never leave the screen static for more than ~1.5s: hand-drawn wobble, stroke-dash draw-on, or a subtle underline pulse counts as motion.
- Keep it short: aim for under ~150 lines. No comments explaining the harness, no unused helpers.

STYLE (doodle/kinetic):
- Rough.js wobble (`roughness ~1.5`, `bowing ~1`) for boxes/arrows/underlines; `strokeDasharray` draw-on synced to `t` for reveal moments.
- Kinetic type: words pop/slide in on their beat (scale 0.8→1 with ease-out, or y-slide 40px), emphasis in `#4CC9F0` / `#F72585` on near-white `#F5F7FA` text, dark `#0B0F19` background.
- SVG morphs: interpolate `d` or transform between two hand-authored paths across the beat window — never generate path data from randomness.

SKELETON (shape only — a two-beat draw-on in ~40 lines):
```html
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<style>html,body{margin:0;width:1080px;height:1920px;background:#0B0F19;color:#F5F7FA;font-family:Arial,sans-serif;overflow:hidden}</style>
</head><body>
<svg width="1080" height="1920" viewBox="0 0 1080 1920">
  <text id="h" x="540" y="300" text-anchor="middle" font-size="96" font-weight="900" fill="#F5F7FA">Squeeze both ends</text>
  <line id="u" x1="240" y1="360" x2="840" y2="360" stroke="#4CC9F0" stroke-width="10"/>
</svg>
<script>
const clamp01 = (x) => Math.min(1, Math.max(0, x));
window.__seek = (t) => {
  const h = document.getElementById("h"), u = document.getElementById("u");
  const k1 = clamp01((t - 0.4) / 0.5);              // beat at 0.4s: title pops
  h.setAttribute("opacity", k1.toFixed(3));
  h.setAttribute("transform", `translate(0 ${(40 * (1 - k1)).toFixed(1)})`);
  const k2 = clamp01((t - 1.9) / 0.6);              // beat at 1.9s: underline draws on
  u.setAttribute("stroke-dasharray", "600");
  u.setAttribute("stroke-dashoffset", (600 * (1 - k2)).toFixed(1));
};
window.__seek(0);
</script></body></html>
```
