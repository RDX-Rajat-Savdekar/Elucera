# elucera component kits (Remotion + Manim)

Two kits with one vocabulary: a **general explainer kit** and an **exhaustive DSA / LeetCode kit**, in both
Remotion (`@kit`, TypeScript) and Manim (`elucera_kit`, Python). Coders are told to compose these instead of
drawing, which is the main lever for shorter code, fewer fix passes and faster scenes (see `ANIMATION_GUIDE.md`).

## 1. What exists online (researched 2026-11-02)

| Source | What it offers | License | Decision |
|---|---|---|---|
| **@remotion/shapes** | Rect, Circle, Triangle, Star, Pie, Polygon, Arrow, Callout | MIT | **Installed**; re-exported from `@kit` |
| **@remotion/paths** | `evolvePath` (line-drawing), path maths | MIT | **Installed**; powers `<Arrow>` |
| **@remotion/rough-notation** | hand-drawn Circle/Underline/Box/Highlight/Strike/Bracket | MIT | **Installed**; powers `<Mark>` |
| **@remotion/transitions** | TransitionSeries, fade/slide/wipe | Remotion license (same as core) | **Installed**; re-exported |
| **@remotion/layout-utils**, **@remotion/noise** | fitText/measureText; 2-D noise | MIT | **Installed** (available for future auto-fit) |
| **lucide-react** | ~1.7k line icons | ISC | **Installed**; 105 curated icons in `<Icon>` and exported as SVG for Manim |
| @remotion/starburst, light-leaks, effects | decorative effects | Remotion license | Skipped (decoration, not explanation) |
| Remotion `template-code-hike` | animated code walkthroughs via Code Hike + Shiki | MIT/Remotion | Skipped: async highlighting fights frame-exact rendering. Our `<CodePanel>` uses a sync tokenizer |
| Curvable motion, remocn, RemotionUI | product-launch style components (typewriter, text swap, stat cards) | MIT / unstated / unstated | Skipped: launch-video aesthetic; the few useful ideas re-implemented |
| **manim-dsa** | MArray, MStack, MGraph, MVariable (+ trees in docs) | MIT, 2025-08 | **API inspiration**: render sandbox has no network, so plugins can't pip-install per render; only 4 structures |
| **manim-data-structures** | MArray, MArrayPointer, MArraySlidingWindow | stale (2023-01) | Pointer/window API inspiration |
| manim-chemistry, manim-circuit, manim-physics, manim-ml | domain objects | MIT / stale | Not needed for DSA; candidates for a future derived Docker image |
| Manim built-ins (`Code`, `NumberLine`, `CurvedArrow`, `SVGMobject`) | pygments code, axes, arcs, SVG | MIT | **Used** inside the Manim kit |

Algorithm-visualisation conventions (VisuAlgo et al.): coloured states for "being examined / compared / done",
named pointers under arrays, bracketed windows, and an active-line highlight in code. These became the shared
**semantic states** below.

Sources: [Remotion monorepo packages](https://github.com/remotion-dev/remotion/tree/main/packages) ·
[Remotion pricing/license](https://www.remotion.dev/docs/license/pricing) ·
[manim-dsa](https://github.com/openeducationai/manim-dsa) ([docs](https://manim-dsa.readthedocs.io/en/stable/guides/animating_stacks.html)) ·
[manim-data-structures](https://manim-data-structures.readthedocs.io/en/stable/guides/arrays.html) ·
[Manim plugins](https://docs.manim.community/en/stable/plugins.html) ·
[Curvable motion](https://github.com/Curvable/motion) · [Remotion component libraries](https://www.remotion.dev/elements/libraries) ·
[VisuAlgo](https://visualgo.net/) · [TheoremExplainAgent](https://arxiv.org/html/2502.19400v1) (hallucinated APIs and layout are the top failure modes).

## 2. Design rules (both kits)

- **Data, not drawing.** DSA components take initial data + `steps` (`{at, …changes}`). A step lists only what
  changes; the rest carries over. The model writes ~20 lines of data instead of ~300 lines of SVG.
- **Same states everywhere:** `default active compare swap done found visited frontier path dim error`
  (`remotion/src/theme.ts` `STATES` ↔ `elucera/render/manim_kit.py` `STATES`).
- **Layout slots, not pixels:** title / main / below regions that keep clear of the caption band (y ≥ 1440 px) and
  the IG chrome. Every structure auto-sizes to fit (≤ 960 px wide in Remotion, ≤ 6.7 units in Manim).
- **Labels never collide:** structure labels reserve their own space; overlays (arrows/callouts) are documented
  as main-region only; Manim state changes are colour-only animations, so they can run with swaps/moves in
  the same `play()` without the label being painted over.

## 3. Catalogue

| | Remotion `@kit` | Manim `elucera_kit` |
|---|---|---|
| Layout | `Stage`, `Slot`, `LAYOUT` | `place()`, `KTitle` |
| Icons | `Icon`, `IconRow` (105 Lucide) | `Icon` (same 105, SVG) |
| Motion | `Arrow`, `Callout`, `Pill`, `Counter`, `Progress`, `Typewriter`, `Pulse`, `Cut` | `LabeledArrow`, `Callout`, `Pill`, `Counter` |
| Blocks | `Headline`, `Mark`, `StepList`, `Split`, `Timeline`, `BarChart`, `Terminal` | `StepList`, `Split`, `Timeline`, `HBarChart` |
| Arrays | `ArrayView` (pointers, window, swap, set, note), `StringView`, `BitRow` | `MArray`, `MString` |
| Grids / DP | `Grid` (set, mark, active, deps arrows, headers) | `MGrid` (set, fill, mark, active, deps) |
| Lists | `LinkedList` (links, pointers, removed; back-links curve) | `MLinkedList` (relink, pointer, mark) |
| Stack / queue | `SeqView` kind stack / queue / callstack | `MStack` (stack/callstack), `MQueue` |
| Hash map | `HashMapView` (entries, active, op) | `MHashMap` (put, get) |
| Trees | `BinaryTree` (LeetCode level order), `Heap` (tree+array), `Trie`, `RecursionTree` | `MBinaryTree`, `MHeap`, `MTrie`, `MRecursionTree` |
| Graphs | `Graph` (weights, directed, badges, visit order) | `MGraph` |
| Intervals | `Intervals` (merged row, sweep) | `MIntervals` |
| Code + vars | `CodePanel` (python/js/ts/java/cpp/go, active line), `VarWatch` | `MCode` (pygments), `MVarWatch` |
| Problem framing | `ProblemCard`, `Complexity`, `ComplexityChart` | `ProblemCard`, `Complexity` |

API references the coders see: `elucera/prompts/kit.md` (Remotion) and `elucera/prompts/manim_kit.md` (Manim).

## 4. Testing a change

```bash
cd remotion && npx tsc --noEmit -p .          # kit + gallery typecheck (also validates every icon name)
npm run gallery -- /tmp/kit-stills            # Remotion: 31 stills from kit-gallery/scenes/*.tsx (~20s)
cd .. && uv run python tests/render_manim_gallery.py   # Manim: one still per section (~30s, Docker)
npm --prefix remotion run export-icons        # after changing the curated icon list
```

Look at the stills: the validator checks code, not layout.

Past library scenes are only shown to coders as examples if they use the kit (`library.uses_kit`), so the old
300-line hand-drawn scenes no longer teach the verbose style.
