# Seek harness — doodle/kinetic renderer (`seek`)

Seek renders hand-drawn / doodle / kinetic-type / SVG-morph scenes for the
Elucera reel pipeline. A seek scene is **one self-contained HTML file**
that exposes a deterministic frame driver; the harness frame-steps it in
headless Chromium and encodes with ffmpeg.

## 1. Authoring contract

- File: single `.html`, canvas **1080x1920** portrait.
- Frame driver: `window.__seek = (t) => {...}`, a **pure function** of `t`
  (seconds from scene start). The renderer calls `__seek(i / fps)` once per
  frame and screenshots — nothing else drives timing.
- LLM contract: [elucera/prompts/seek_code.md](../elucera/prompts/seek_code.md).
- Renderer module: [elucera/render/seek_renderer.py](../elucera/render/seek_renderer.py)
  (`SeekRenderer`, `suffix = ".html"`).
- Determinism: no `Math.random`, `Date`, `performance.now`, `crypto`
  randomness, `fetch`/`XHR`/`WebSocket`. Same `t` ⇒ same pixels.
- Safe zones (shared with all renderers): titles in y 192–420, diagrams
  above y=1300, captions are burned in below y=1440 — never render narration
  text as subtitles.
- External scripts: **pinned CDN only** (exact URLs, kept in sync between
  `seek_code.md` and `PINNED_SCRIPTS` in `seek_renderer.py`):
  - `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js`
  - `https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js`
  - `https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js`
  - `https://cdn.jsdelivr.net/npm/p5.brush@1.1/dist/p5.brush.js`
- Scenes must degrade gracefully if a CDN is unreachable at render time
  (`typeof gsap !== "undefined"` guards, plain canvas/SVG fallback drawing).

## 2. Validator gates (`SeekRenderer.validate`, offline, no browser)

1. Non-empty HTML (`<html>` or `<script>` present).
2. Defines `window.__seek(t)` (assignment of a one-arg function).
3. Mentions both `1080` and `1920` (viewport / canvas / CSS sizing).
4. Every `src=`/`href=` URL is in the pinned CDN list — anything else rejected.
5. No banned nondeterminism/live-data patterns (see `BANNED_PATTERNS`).

`validate` never launches a browser and never touches the network, so it is
safe to run in the generate→validate→repair loop.

## 3. Render path (`SeekRenderer.render`, like `remotion_renderer.py`)

1. `validate` first; rejection returns `Check(False, ...)` for the repair loop.
2. `frames = max(1, round(duration * settings.fps))`.
3. Capture: Playwright (python) if installed — one page at 1080x1920,
   `wait_for_function("typeof window.__seek === 'function'")`, then per frame
   `__seek(i/fps)` + screenshot. Fallback: system Chromium CLI
   (`CHROME_PATH` env or `chromium`/`google-chrome` on PATH) with a per-frame
   wrapper that calls `__seek(t)` on `load` and `--screenshot` after
   `--virtual-time-budget=3000`. Neither driver implies approval: if no driver
   exists, `render` returns `Check(False, ...)` with install guidance.
4. Encode PNGs with `settings.ffmpeg`:
   `-framerate fps -i f%04d.png -c:v libx264 -preset veryfast -crf 18
   -pix_fmt yuv420p -r fps`.

## 4. Fallback

Unchanged: if all `max_render_attempts` fail, `build_scene` falls back to the
existing template title-card path (`render_fallback`: title + keywords). Seek
failures feed the same repair loop and lesson log as other renderers.

## 5. Routing (wiring owned by the pipeline, not this harness)

- `Renderer.seek = "seek"` in `elucera/models.py`; `SeekCoder(Coder)` in
  `elucera/agents/coders/seek.py` (system prompt = `seek_code.md`,
  `suffix ".html"`).
- Planner rule: scene descriptions mentioning doodle / hand_drawn / kinetic /
  svg_morph route to `seek`. Seek is **director-only**: it is used when the
  director note or user preference requests it, never as an automatic default.
- `coder_for(Renderer.seek)` returns the seek coder so `build_scene` picks it
  up with no other changes.

## 6. Tests

[tests/test_seek_harness.py](../tests/test_seek_harness.py): offline unit
tests only (no network, no browser) covering validator accept/reject gates,
prompt↔renderer pin sync, and the no-driver render failure message.
