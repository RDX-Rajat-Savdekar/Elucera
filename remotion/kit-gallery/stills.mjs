// Visual regression gallery for @kit: renders still frames of every gallery scene to PNG.
// Usage: node kit-gallery/stills.mjs [outDir] [sceneNameFilter]
// Each scene file exports `export const frames = [..]` (frames to capture) and a default component.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? path.join(here, "out"));
const filter = process.argv[3] ?? "";
fs.mkdirSync(out, { recursive: true });
const scenes = fs.readdirSync(path.join(here, "scenes")).filter((f) => f.endsWith(".tsx") && f.includes(filter)).sort();
const entry = path.join(here, ".entry.tsx");
fs.writeFileSync(entry, `import React from "react";
import { Composition, registerRoot } from "remotion";
${scenes.map((f, i) => `import S${i}, { frames as F${i} } from "./scenes/${f.replace(".tsx", "")}";`).join("\n")}
const Root = () => (<>
${scenes.map((f, i) => `  <Composition id="${f.replace(".tsx", "").replace(/[^a-zA-Z0-9-]/g, "-")}" component={S${i}} durationInFrames={Math.max(...F${i}) + 2} fps={30} width={1080} height={1920} />`).join("\n")}
</>);
registerRoot(Root);
`);
const serveUrl = await bundle({
  entryPoint: entry,
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), "@kit": path.join(here, "../src/kit/index.ts") } } }),
});
for (const f of scenes) {
  const id = f.replace(".tsx", "").replace(/[^a-zA-Z0-9-]/g, "-");
  const mod = fs.readFileSync(path.join(here, "scenes", f), "utf8");
  const frames = JSON.parse(mod.match(/export const frames = (\[[^\]]*\])/)[1]);
  const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: "angle" } });
  for (const frame of frames) {
    const file = path.join(out, `${id}_${String(frame).padStart(4, "0")}.png`);
    await renderStill({ composition, serveUrl, output: file, frame, chromiumOptions: { gl: "angle" } });
    console.log(file);
  }
}
fs.rmSync(entry, { force: true });
