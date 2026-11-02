# Elucera — automated science explainer Reels

Topic in, 1080x1920 captioned explainer Reel out. See `GEMINI.md` for the project brief.

```
topic → script (Muse Spark) → voiceover (Gemini TTS) + word timings (faster-whisper)
      → scene plan (Muse picks manim | remotion | three per segment, beats timed to words)
      → per-segment code-gen → validate → render, self-fixing up to 3×, fallback card
      → ffmpeg: fit clips, concat, mux narration, burn word-highlight captions
```

## Setup (macOS)

```bash
brew install node ffmpeg-full colima docker
colima start --cpu 6 --memory 8
docker pull manimcommunity/manim:stable
uv sync
(cd remotion && npm install)
cp .env.example .env   # fill MUSE_API_KEY, GEMINI_API_KEY
```

`ffmpeg-full` is required (the plain formula lacks libass, which burns the captions). Paths to `ffmpeg`, `node`
and `docker` are configurable in `.env` (see `elucera/config.py`).

## Usage

```bash
uv run elucera make "how does the TCP handshake work"     # → outputs/<slug>/final.mp4
uv run elucera render-scene tests/fixtures/sample_2d.tsx  # test a hand-written scene (.py = Manim)
uv run elucera voice "Some narration"                     # TTS + word timings
uv run uvicorn elucera.api:app                            # POST /jobs {"topic"}, GET /jobs/{id}, GET /jobs/{id}/video
uv run pytest
```

Each job directory keeps `script.json`, `audio.json`, `plan.json`, every generated scene attempt
(`segN_tryK.py|.tsx`) and `results.json`, which is the place to look when tuning prompts.

## Asset library (`library/`)

Every run builds on the previous ones:

- Each scene that renders is saved to `library/scenes/<id>/` (code, `meta.json`, `thumb.png`, `clip.mp4`).
- Each finished reel is saved to `library/reels/<job>/` (script, plan, results, `strip.png`, `final.mp4`).
- Each error the self-fix loop got past is recorded in `library/lessons.jsonl`.
- Coder prompts automatically include the 1–2 most similar past scenes for the same renderer, plus the known pitfalls.

```bash
uv run elucera library list [--renderer three]   # browse (thumbnails in library/scenes/*/thumb.png)
uv run elucera library star <id>                 # prefer a great scene as an example
uv run elucera library rm <id>                   # drop a bad one so it is never imitated
uv run elucera library lessons                   # pitfalls fed to the coders
uv run elucera library add-lesson manim "<error>" --note "<how to avoid>"
uv run elucera library import outputs/<job>      # backfill from an old job directory
```

Code, metadata, lessons and thumbnails are committed to git; `.mp4` files stay local (gitignored).
Set `USE_LIBRARY=false` in `.env` for a clean-slate run.

## Layout

- `elucera/agents/` — script writer, scene planner, per-renderer coders + the render/fix loop (`coders/base.py`)
- `elucera/prompts/` — all LLM prompts; `kit.md` documents the Remotion component kit for the coder
- `elucera/render/` — Manim (Docker, no network) and Remotion (host Chromium) renderers, fallback card
- `elucera/audio/`, `elucera/assemble/` — TTS, alignment, captions, ffmpeg
- `remotion/` — Remotion project: `src/kit/` house components, `render.mjs`, `validate.mjs` (import allowlist,
  banned non-deterministic APIs, esbuild + tsc check)

## Safety model

LLM-written Manim (Python) runs only inside `docker run --network none` with CPU/memory/pid limits after an AST
import/call blocklist. LLM-written TSX runs inside headless Chromium's sandbox after an import allowlist; the
Node side only bundles it.
