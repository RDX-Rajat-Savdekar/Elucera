# Elucera final videos

Watch these right here on GitHub (click any file to play it).

| Video | What it is | How it was made |
|---|---|---|
| **`elucera-hackathon-demo.mp4` (2:00)** | **Hackathon pitch**: the problem with AI-slop video, cost vs. Sora/Veo, stock tools and animators, then a live dark-mode run ("How does public-key encryption work?") from topic to finished reel, Redo, and the library. Narrated with burned-in captions; `elucera-hackathon-demo.srt` is the sidecar subtitle file | Real run recorded with Playwright; voiceover by Elucera's own Gemini TTS + Whisper alignment; cards rendered frame-by-frame from HTML; cut with ffmpeg. Cost figures: `elucera/costs.py` sources + this run's measured ledger |
| `reel-public-key.mp4` (49s) | The reel that demo run produced: "The Open Lock Trick", 4 scenes, all first-try renders | `outputs/5e7fc8e8dd88/final.mp4` |
| `elucera-demo.mp4` (95s) | The project demo: one real pipeline run about Elucera itself, then one clip from each engine | `elucera make` pipeline reel + per-engine clips, assembled with ffmpeg |
| `engine-manim.mp4` | Mechanism diagram in the 3Blue1Brown style | Manim renderer, Docker sandbox |
| `engine-remotion.mp4` | Kinetic type and diagram scene | Remotion renderer (React + headless Chromium) |
| `engine-three.mp4` | Orbiting torus knot + H₂O molecule | Three.js via the Remotion pipeline (`@kit` Scene3D/Molecule3D) |
| `engine-seek.mp4` | Hand-drawn doodle: p5.js + p5.brush charcoal + GSAP headline, every frame a pure function of time | Seek renderer (`window.__seek(t)` + headless Chromium frame-step) |
| `kit-remotion-showreel.mp4` (105s) | Tour of the 2D component kit | `remotion/kit-gallery/showreel.mjs` |
| `live-run-sky-blue.mp4` (103s) | Live run in the web UI: type a topic, review the storyboard, approve, watch it build, then the finished reel with sound. Waiting is sped up (labelled 6× / 12×) | Real run (Muse + Gemini), recorded with Playwright driving Chrome, cut with ffmpeg |
| `live-run-sky-blue-full.mp4` (4m10s) | The same run uncut, real time, silent: topic to finished reel in about 4 minutes | Raw Playwright screen recording |
| `reel-sky-blue.mp4` (56s) | The reel that run produced: "Why the Sky Is Blue", 4 Remotion scenes, all first-try renders | `outputs/ded31aaa1401/final.mp4` |

The same engine clips also play on the homepage Engines section when the app runs (`uv run uvicorn elucera.api:app --host 127.0.0.1 --port 8001`, open http://127.0.0.1:8001/). Source scenes live under `library/engines/<engine>/scene.*` where reproducible; pipeline reels under `library/reels/`.
