# elucera: speed, cost, engagement and asset research

> Researched and measured 2026-11-02. Timings come from the 4 finished runs in `outputs/` plus two controlled
> Muse benchmarks. Prices are public list prices; third-party figures are flagged. Re-measure after changes:
> the in-app **Analytics** page (`#/analytics`) recomputes all of this from live data.

## 1. Where the time goes (measured)

| Stage | Median | Range | What it is |
|---|---|---|---|
| Script | 15s | 15–17s | 1 Muse call (skipped when a storyboard is approved) |
| **Voice** | **98s** | 9–208s | 1 Gemini TTS call. Fast runs take 9–17s; slow runs are **free-tier rate-limit waits** |
| Word sync | 3s | 3s | faster-whisper, local |
| Plan | 33s | 28–45s | 1 Muse call |
| **Animate** | **146s** | 97–193s | 4 scenes in parallel: **~75s of Muse writing code** + ~10s rendering, +31–56s per fix pass |
| Assemble | 8s | 6–14s | ffmpeg (≈6s when profiled alone) |
| **Total** | **5m 03s** | 2m 38s – 7m 29s | |

**Rendering is not the bottleneck** (~10s per scene). The two slow parts are waiting for models: the voice (when
rate-limited) and Muse writing long scene code. Generated scenes have a median of **334 lines** (max 635), and output
length is what dominates a model call's latency.

### Muse reasoning effort (controlled benchmark, same prompt, real scenes)

| Scene | default | medium | low |
|---|---|---|---|
| public-key, scene 2 | 50s · 7.4k out | — | 22s · 3.4k out |
| public-key, scene 3 | 102s · 13.8k out (7.6k reasoning) | **62s** · 9.8k out | 34s · 5.7k out |
| Frames (scene 3) | lock drawn over its label | **cleanest layout** | one title overlap |

All variants passed the validator and rendered. **Shipped: `MUSE_CODE_EFFORT=medium`** for scene code only;
the script and plan stay at the provider default. This is one sample: re-check on the next few real reels.

## 2. What was changed for speed (this pass)

| Change | Saves | Where |
|---|---|---|
| **Review-time prefetch**: when a storyboard is ready, the server records the voice and plans the scenes while you read it. Approving with unchanged narration/visuals/note reuses both. | **voice + plan ≈ 45–250s** off the wait | `api._prefetch`, `graph.prefetch`, `cache.plan_*` |
| Scene code at medium reasoning effort | ~40% of each scene's code time (≈ 25–40s on the critical path) | `config.muse_code_effort` |
| "Under ~150 lines, no comments" coder rule | fewer output tokens → faster, fewer bugs (unmeasured yet) | `prompts/remotion_code.md` |
| Parallel clip fitting + `veryfast` final encode | ~1–2s | `graph.assemble_job`, `config.final_preset` |
| Exact-match caches (voice, plan, scene clip) | the whole step on resumes/repeats | `elucera/cache.py` |

**Expected first-run time after these:** about 15s script (at pitch) + 0s voice and plan when approved
unchanged + ~70–110s animate + ~7s assemble ≈ **1.5–2 minutes from approval** (was ~5 minutes). Re-measure on the
Analytics page.

### Next levers, ranked by impact

1. **A bigger component kit (biggest remaining lever).** The coder rebuilds icons, arrows, counters, timelines and
   charts from scratch every scene. With ~15 tested components the coder writes ~60–120 lines of composition
   instead of ~334 lines of drawing. That cuts code time roughly in half again and removes most fix passes
   (36% of 2D scenes needed one). See §5 for what to reuse vs build.
2. **Paid Gemini TTS tier, or a second key.** It removes the 100–200s rate-limit waits (cost ≈ $0.01/reel).
3. **Stream codegen into validation.** Start `tsc` as soon as the code block closes, rather than waiting for the
   model's trailing text. Small win.
4. **Speculative scene codegen during review** (behind a flag). It costs Muse tokens for storyboards that are never approved.

## 3. Cost per reel (measured from artifacts; ledger-measured from now on)

| Component | Median per reel | Notes |
|---|---|---|
| Muse (script, plan, scene code, fixes) | **$0.009** contributor rate · ≈ $0.17 at list price | `muse-spark-1.3-contributor` is in `.env`. The $0.10/$0.20 per M contributor price comes from one unconfirmed source; standard list is $1.25 in / $4.25 out per M |
| Gemini TTS | $0.011 | $10/M audio tokens × 25 tokens/s. $0 on the free tier |
| Compute (render box) | $0.029 | 8 vCPU at $0.34/h × wall time |
| Remotion license | $0.05 | $0.01/render, **only for companies of more than 3 people** (Automators tier, $100/mo minimum) |
| **Total** | **$0.095** (≈ $0.26 at list price) | **≈ $0.12 per finished minute** |

### Compared with other ways to make a 45-second explainer

| Option | $ per finished minute | vs elucera | Source |
|---|---|---|---|
| **elucera** | **$0.12–0.36** | — | measured |
| Pictory Starter (stock footage + TTS) | ~$0.12–0.15 | ~1× | plan caps ([frameloop](https://frameloop.ai/blog/ai-video-generator-pricing-compared)) |
| Synthesia Starter (avatar) | ~$1.8–2.9 | ~15× | ([fluxnote](https://fluxnote.io/guides/ai-video-tool-pricing-answered)) |
| Google Veo 3.1 API (generative) | $6–24 | ~50× | $0.10–0.40/s ([wavespeed](https://wavespeed.ai/blog/cost-and-billing/google-veo-3-pricing/)) |
| OpenAI Sora 2 API (generative) | $6–42 | ~50× | $0.10–0.70/s ([magichour](https://magichour.ai/blog/sora-2-pricing)) |
| Freelance 2D animator | $1,000–3,000 | ~8,500× | ([maverickframe](https://maverickframe.com/blog/explainer-video-cost/)) |
| Studio / agency | $3,000–10,000+ | ~25,000× | ([contentbeta](https://www.contentbeta.com/blog/explainer-video-cost/)) |

**Positioning:** elucera is priced like stock-footage tools but produces **custom, accurate, diagrammatic
animation** like a studio does, in ~2 minutes. Generative video (Veo/Sora) costs ~50× more and can't
reliably draw correct diagrams, labels or math. Vendor pages mostly price by plan, not per minute, so treat the SaaS rows as derived.

## 4. Engagement: what to bake into the prompts

The evidence is mostly creator-analytics blogs, not peer-reviewed studies, and the numbers disagree. These are
the points most sources agree on, treated as defaults to A/B test, not laws:

- **Hook in the first 2–3 seconds, payoff-first.** Name what the viewer will understand and open a loop ("Your password never leaves your laptop. Here's how.").
  *→ added to `script.md`.*
- **A visual change every ~2–4 seconds.** Sources range from 1.5s to 7s; 2–3s is the common middle for education.
  *→ added to `scene_plan.md` (coder prompt already forbids >1.5s static).*
- **Progressive reveal:** one labelled element per beat; build the diagram rather than showing it whole.
  *→ added to `scene_plan.md`.*
- **Captions on screen** (many viewers watch muted). *Already done: word-highlight burned captions.*
- **Length:** educational content holds 35–45s if the payoff is clear. *Already our "standard" length.*
- **Loopable ending:** echo the hook's phrase, and make the last frame rhyme with the first, so replays count as watch time.
  *→ added to `script.md` and `scene_plan.md`.*
- **One idea per reel / per scene** (3Blue1Brown-style, per community guides; not a quoted Grant Sanderson rule).
  *Already in `script.md`.*

Sources: [OpusClip Shorts retention](https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention),
[OpusClip TikTok](https://www.opus.pro/blog/tiktok-length-format-retention-data),
[grow-it benchmarks](https://www.grow-it.se/en/resources/short-form-video-retention-benchmarks),
[aibrify retention curve](https://aibrify.com/blog/youtube-shorts-retention-curve-playbook),
[zella educational](https://zellahq.com/blog/how-to-make-educational-content-that-goes-viral/).

### Prompting practices for code-generated animation

From TheoremExplainAgent (ACL 2025) and ManimBench, and from our own fix logs:

- **Hallucinated APIs are the #1 failure** (TheoremExplainAgent's analysis). Restrict imports to a known kit,
  and feed the coder only APIs it has seen, via retrieval or examples. *We do both: `@kit` + similar library scenes.*
- **Layout/overlap is the #2 failure.** Fixed slots beat free placement: give the coder named regions (title band,
  stage, footer) rather than pixel freedom. *Partly done (LAYOUT CONTRACT); a slot-based kit is the real fix (§5).*
- **Planner/coder split works.** Agentless single-shot generation fails beyond ~20s of video. *We already split it.*
- **Shorter code means fewer bugs and less time.** Ask for composition, not drawing. *→ "under ~150 lines" rule.*
- **Every beat is tied to a spoken word with an exact time.** *Already done via word timings.*

Sources: [TheoremExplainAgent](https://arxiv.org/html/2502.19400v1),
[ManimBench](https://www.kaggle.com/datasets/ravidussilva/manim-sft/data),
[Training/agentic Manim generation (2026)](https://arxiv.org/html/2604.18364).

## 5. Asset library: reuse vs build

**Verdict: reuse open-source primitives (icons, shapes, transitions, 3D models), and build the layout and domain
components ourselves.** Nothing off the shelf knows our 1080×1920 caption-safe layout contract or our beat timing.

### Reuse (licenses checked)

| Asset | What it gives us | License | Fit |
|---|---|---|---|
| **Lucide** (`lucide-react`) | ~1.7k clean line icons. LLMs already know the names (Lock, Server, Key…) | ISC (MIT-like) | **High.** Replaces hand-drawn SVG icons, a big share of current code |
| Tabler Icons | ~5–6k icons, broader coverage | MIT | Fallback set |
| Simple Icons | brand logos (AWS, Postgres…) | CC0 | Tech explainers |
| **@remotion/transitions, /shapes, /paths** | scene transitions, primitive shapes, `evolvePath` line-drawing | Remotion license | **High.** First-party, same version as Remotion |
| @remotion/lottie + LottieFiles free animations | pre-made motion (checkmarks, loaders, characters) | Lottie Simple License: commercial OK, **may not bulk-collect to build a competing service** | Medium: hand-pick a small curated set; don't scrape |
| **Kenney / Quaternius / Poly Haven** | glTF 3D models, HDRIs | CC0 | High for 3D scenes (servers, planets, molecules) via drei `useGLTF` |
| **manim-dsa** | arrays, stacks, graphs, linked lists | MIT, updated 2025-08 | High if Manim usage grows |
| manim-chemistry | molecules, periodic table | MIT, 2025-02 | Medium |
| manim-circuit | circuit elements | MIT, 2025-01 | Niche |
| manim-physics / manim-ml / chanim | physics, neural nets, chemistry | stale (2021–2024) | Low: unmaintained |

The Manim plugins matter less today: of the 43 scenes in `library/`, **3 are Manim**, 28 are 2D Remotion and 12 are 3D.

> **Status 2026-11-02: built.** Both kits now exist (Remotion `@kit` + Manim `elucera_kit`), including the full DSA
> set. See `docs/COMPONENT_KIT.md` for the catalogue, research and test commands. The list below was the proposal.

### Build (kit components, slot-based)

Current kit: `Title, Appear, Highlight, CodeBlock, ArrayBars, NodeGraph, Molecule3D, Scene3D`. Proposed additions,
taken from what generated scenes keep re-implementing:

- **Layout:** `Stage` with named slots (`title`, `main`, `aside`, `footer`) that enforce the caption band and
  no-overlap by construction. This fixes overlaps structurally.
- **Primitives:** `Icon` (Lucide wrapper with label + safe padding), `Arrow` (animated path), `Callout`, `Badge`,
  `Counter` (number roll), `Progress`, `Split` (before/after comparison).
- **Domain:** `PacketFlow` (extends NodeGraph), `Timeline`, `BarChart`, `Equation` (KaTeX), `Terminal`,
  `KeyLock` (crypto metaphors recur), `Stack/Queue`.

Each component ships with a still-frame test render, so a regression is visible before the model ever uses it.

**Licensing note for selling:** Remotion is free for individuals and companies of **up to 3 people**. Above that,
a Company License is needed (Automators: $0.01/render, $100/mo minimum). It's already in the cost table.
([Remotion pricing](https://www.remotion.dev/docs/license/pricing))

## 6. Muse for voice

Not available: the Muse `/models` list has no TTS model and `/audio/speech` returns 404. It does list
`muse-voice-transcribe-1.0` (speech-to-text), a candidate to replace local Whisper for word timings.
That only helps if it returns word-level timestamps; untested.
