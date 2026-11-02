// Stitch every gallery scene into one showreel video with component captions.
// Usage: node kit-gallery/showreel.mjs out.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? "showreel.mp4");
const TAGS = {
  g1_stage_icons: "Stage · Slot · IconRow · Arrow · Callout · Pill",
  g2_blocks: "StepList · Mark · Progress",
  g3_charts: "BarChart · Counter",
  g4_split_timeline_terminal: "Split · Terminal · Timeline",
  d1_array_two_pointers: "ArrayView · pointers · window · VarWatch",
  d2_string_window_swap: "StringView · window · swap",
  d3_grid_dp: "Grid · set · active · deps",
  d4_linked_list: "LinkedList · links · pointers",
  d5_stack_queue_map: "SeqView (stack, queue) · HashMapView",
  d6_tree: "BinaryTree · visit · badge · edgeMark",
  d7_graph_bfs: "Graph · SeqView queue",
  d8_heap_trie: "Heap · Trie",
  d9_code_problem: "ProblemCard · CodePanel · Complexity",
  d10_intervals_recursion: "Intervals · RecursionTree · ComplexityChart",
};
const scenes = fs.readdirSync(path.join(here, "scenes")).filter((f) => f.endsWith(".tsx")).sort((a, b) => {
  const k = (f) => (f.startsWith("g") ? 0 : 100) + parseInt(f.slice(1));
  return k(a) - k(b);
});
const lens = scenes.map((f) => Math.max(...JSON.parse(fs.readFileSync(path.join(here, "scenes", f), "utf8").match(/export const frames = (\[[^\]]*\])/)[1])) + 20);
const total = lens.reduce((a, b) => a + b, 0);
const entry = path.join(here, ".showreel.tsx");
fs.writeFileSync(entry, `import React from "react";
import { AbsoluteFill, Composition, Series, registerRoot } from "remotion";
${scenes.map((f, i) => `import S${i} from "./scenes/${f.replace(".tsx", "")}";`).join("\n")}
const Tag = ({ text }: { text: string }) => (
  <AbsoluteFill style={{ top: 1600, height: 120, alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: "'SF Mono', Menlo, monospace", fontWeight: 800, fontSize: 34, color: "#8A93A6", padding: "10px 26px", border: "3px solid #34405C", borderRadius: 18, background: "#0E1320" }}>{text}</div>
  </AbsoluteFill>
);
const Reel = () => (
  <Series>
${scenes.map((f, i) => `    <Series.Sequence durationInFrames={${lens[i]}}><S${i} /><Tag text={${JSON.stringify(TAGS[f.replace(".tsx", "")] ?? f)}} /></Series.Sequence>`).join("\n")}
  </Series>
);
registerRoot(() => <Composition id="Showreel" component={Reel} durationInFrames={${total}} fps={30} width={1080} height={1920} />);
`);
const serveUrl = await bundle({
  entryPoint: entry,
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), "@kit": path.join(here, "../src/kit/index.ts") } } }),
});
const composition = await selectComposition({ serveUrl, id: "Showreel", chromiumOptions: { gl: "angle" } });
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, chromiumOptions: { gl: "angle" }, concurrency: 6, muted: true });
fs.rmSync(entry, { force: true });
console.log(out, `${(total / 30).toFixed(1)}s`);
