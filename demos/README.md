# Elucera final videos

Watch these right here on GitHub (click any file to play it).

| Video | What it is | How it was made |
|---|---|---|
| `elucera-demo.mp4` (95s) | The project demo: one real pipeline run about Elucera itself, then one clip from each engine | `elucera make` pipeline reel + per-engine clips, assembled with ffmpeg |
| `engine-manim.mp4` | Mechanism diagram in the 3Blue1Brown style | Manim renderer, Docker sandbox |
| `engine-remotion.mp4` | Kinetic type and diagram scene | Remotion renderer (React + headless Chromium) |
| `engine-three.mp4` | Orbiting torus knot + H₂O molecule | Three.js via the Remotion pipeline (`@kit` Scene3D/Molecule3D) |
| `engine-seek.mp4` | Hand-drawn doodle: p5.js + p5.brush charcoal + GSAP headline, every frame a pure function of time | Seek renderer (`window.__seek(t)` + headless Chromium frame-step) |
| `kit-remotion-showreel.mp4` (105s) | Tour of the 2D component kit | `remotion/kit-gallery/showreel.mjs` |

The same engine clips also play on the homepage Engines section when the app runs (`uv run uvicorn elucera.api:app --host 127.0.0.1 --port 8001`, open http://127.0.0.1:8001/). Source scenes live under `library/engines/<engine>/scene.*` where reproducible; pipeline reels under `library/reels/`.
