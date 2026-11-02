# HANDOFF — elucera (automated explainer-reel pipeline)

> Last updated: 2026-11-02. Read this, then `README.md`, then run the checks
> in §5. Everything below is verified state, not aspiration.

## 1. What this is
Type a topic → director reviews a storyboard → approve → pipeline produces a
captioned 1080x1920 MP4 explainer reel (chat + dashboard UI). Three animation
engines: **Manim** (math), **Remotion/2D** (kinetic type), **Three.js/3D**
(depth). No AI-generated video — everything is code-rendered. Built for the
Meta Global AI Developer Hackathon.

## 2. Current state (all verified this session)
- Full run works: script (Muse Spark) → voice (Gemini TTS, Puck) → Whisper
  word timings → scene plan → parallel renders → captioned assembly.
- Proof: `outputs/f161be1eb7ff/final.mp4` (planes, 50.8s) and TCP reel rescued
  after a real alignment bug (see §6).
- 32/32 pytest green. Web UI served by the API itself (`web/` static mount).
- Live server (dev only): `uv run uvicorn elucera.api:app --port 8901` →
  http://127.0.0.1:8901. It runs in someone's terminal, not hosted anywhere.

## 3. How it fits together
- `elucera/graph.py` — LangGraph: script → voice (+align) → plan → scene
  (parallel coders) → assemble. `run()` = full; `run_approved()` = from an
  approved pitch script (skips script gen). Pitch endpoints in `elucera/api.py`.
- `elucera/agents/coders/` — one coder per engine; prompts in
  `elucera/prompts/*.md` ARE the product (layout contract, determinism rules).
  Prompts are process-cached: **restart the server after editing them**.
- `elucera/render/` — Dockerized Manim, Remotion/Chromium, per-scene
  `@remotion/player` bundles (`player_bundle.py`) for interactive chat embeds.
- `elucera/audio/` — Gemini TTS + faster-whisper + script-anchored alignment.
- `elucera/library/` — saved scenes/reels/lessons feed back into coder prompts.
- `elucera/chats.py`, `elucera/analytics.py` — server-side threads + run metrics.
- `web/` — vanilla JS chat + dashboard + storyboard review + director panel.

## 4. Setup (macOS)
```bash
brew install node ffmpeg-full colima docker
colima start --cpu 6 --memory 8
docker pull manimcommunity/manim:stable
export UV_CACHE_DIR=/tmp/uv-cache   # sandbox blocks ~/.cache; harmless outside it
uv sync
(cd remotion && npm install && npx remotion browser ensure)
cp .env.example .env   # then fill keys (see below)
uv run pytest                        # expect 32 passed
uv run uvicorn elucera.api:app --port 8901
```
`.env` (gitignored — NEVER commit): `MUSE_API_KEY` + `MUSE_BASE_URL`
(OpenAI-compatible), `GEMINI_API_KEY` + optional `GEMINI_API_KEYS` pool,
`FFMPEG`/`FFPROBE` pointing at ffmpeg-full (libass required for captions).
Teammate: bring your own keys; the ones used so far live only in chat history.

## 5. Key decisions (do not revisit casually)
- Code-generated visuals only; stock B-roll allowed, generative video banned.
- Chat proposes a **pitch first** (cheap script-only call); pipeline runs only
  on approval. Storyboard narrations are editable and go straight to VO.
- Director's note (pitch-level) → planner hard constraint; per-scene redo note
  → "Viewer feedback" appended to the rebuild.
- Voice locked to Puck + director style prompt (probe-verified alignment-safe).
- One focal group per beat, fade-outs, caption band ≥1440 (diagrams above
  y=1300), icons never cover text — in every coder prompt (LAYOUT CONTRACT).
- Analytics/chats runtime data lives in gitignored `analytics/`, `chats/`.

### Studio flow (2026-11-02)
- **Chats** are owned by an anonymous per-browser id (`localStorage["elucera.uid"]` → `X-Elucera-User`).
  Threads hold ordered `items` (pitches and jobs); the server is the source of truth on reload. No login.
- **Redo ≠ rebake.** `POST /jobs/{id}/scenes/{i}/retry` rebuilds ONE scene (note, edited prompt via
  `description`, engine switch, or `library_scene` reuse), archives the old clip as `seg{i}.v{n}.mp4` and
  appends to `scene_history.json`. Nothing is reassembled until `POST /jobs/{id}/rebake`.
  `POST .../revert` swaps back. The UI shows before/after, a prompt diff and a "Rebake reel" banner.
- **Failover:** transient errors (rate limit, network, Muse outage) auto-resume once (`auto_retry` event).
  After that, the failbox offers `POST /jobs/{id}/resume`, which restarts from the first missing artifact
  (`graph.resume_point`). Each scene now writes `seg{i}.result.json` as it finishes.
- **Reuse:** `elucera/cache.py`. Identical voice text reuses the wav + word timings (Gemini only, never
  the fallback voice). An identical scene spec reuses the clip. Redos bypass the cache. Lives in gitignored `cache/`.
- **Muse for voice:** not possible. `/models` has no TTS and `/audio/speech` 404s. It does list
  `muse-voice-transcribe-1.0` (STT), a possible Whisper replacement.
- **Themes:** light/dark/system toggle; colours are tokens in `web/style.css` `:root` / `[data-theme]`.

### Speed + cost (2026-11-02, see `docs/ANIMATION_GUIDE.md`)
- Measured bottlenecks: voice (Gemini free-tier rate limits, 9–208s) and Muse scene codegen (~75s/scene,
  median 334 lines). Rendering is ~10s/scene; assembly ~7s.
- **Review-time prefetch** (`prefetch_on_pitch`): a ready storyboard triggers voice + plan in the background.
  Approving unchanged reuses both via `cache.tts_*` / `cache.plan_*`. Approval waits for an in-flight prefetch.
- **`MUSE_CODE_EFFORT=medium`** for scene code (benchmarked: 102s → 62s on one scene, cleanest layout).
- **Usage ledger:** `elucera/usage.py` writes `usage.jsonl` per job/pitch (tokens, seconds). `elucera/costs.py`
  plus `GET /analytics/dashboard` feed the `#/analytics` page. Prices are `PRICE_*` in config/.env.
- **Tests can't reach real APIs:** `tests/conftest.py` makes any Muse/Gemini network call fail the test.

### Component kits (2026-11-02, see `docs/COMPONENT_KIT.md`)
- Remotion `@kit` (general + DSA) and Manim `elucera_kit` (same components and states) are documented to the
  coders in `prompts/kit.md` and `prompts/manim_kit.md`. Prompts say "compose, don't draw".
- Measured with real Muse calls: DSA scenes came out at 33–52 lines (was a median of 334), first try, in 25–44s
  including the render.
- Galleries: `npm --prefix remotion run gallery -- <dir>` and `uv run python tests/render_manim_gallery.py`.
  Manim footgun: animating a shape alone lifts it over its label. Kit state changes use the colour-only `Recolor`.
- Only kit-based library scenes are fed to coders as examples (`library.uses_kit`).

## 6. Bugs we hit (so you don't re-discover them)
- Spoken style-preamble leaked into segment timings → align narration-only
  text (`graph.py` voice flow; test `test_heard_preamble_does_not_shift`).
- Bare `manim -qh` → 60fps/wrong folder: always render via the locked wrapper.
- `Text()` custom fonts collapse glyphs; never `set_width` labels; clear
  Manim text cache after font changes.
- Remotion: drive everything off `useCurrentFrame`, damping inside `config`,
  `import type`, `{"->"}` in JSX, Chromium needs ANGLE for WebGL.
- Overlaps (lock over label, counters pile-up, captions colliding): prompt
  contract + recorded lessons; structural fix still open (see §7).
- Sandbox quirks (dev machine only): no socket binds from agent shells,
  `~/.cache` unwritable (use `/tmp` caches), ports 8000/18080 blocked.

## 7. Pending work (in priority order)
1. **True orbit in Explore** — Player scrubs but camera is fixed. Add an
   `interactive` prop to `remotion/src/kit/Scene3D.tsx` (drei OrbitControls
   behind a `window.__ELUCERA_INTERACTIVE__` flag set by `player.mjs`),
   rebuild bundles, backfill library three scenes.
2. **Vision QA gate** — screenshot each scene at 3 timestamps, vision-model
   review for overlaps/small text/caption collisions, auto-feed findings as
   redo notes. (Automates our "inspect PNGs yourself" rule.)
3. **Bounded asset library** — kit components declaring bounding boxes
   (Title, CaptionChip, LockBadge…); planner composes from catalog on a grid.
4. **BYOK in UI** — keys still server-side in `.env`; add chat key/model picker.
5. **Spelling QA** in the fix loop; **Manim maiden render** (Docker ready,
   never used); voice cloning later.
6. Uncommitted overflow: keep `outputs/`, `.venv`, `node_modules`, `.env`
   out of git (all ignored). Commit prompts + web + tests + library code/meta.

## 8. Working agreements
- Smallest correct fix at root cause; reproduce against real code first.
- New behavior ships with a focused test (`tests/test_api.py`,
  `tests/test_align.py`); full suite must stay green.
- Docs live with code: new footgun → row in the relevant prompt + lesson via
  `elucera library add-lesson <engine> "<error>" --note "<fix>"`.
- Never commit `.env`, `outputs/`, keys, or `*.mp4` (all ignored — verify).
