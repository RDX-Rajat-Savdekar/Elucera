// Export the curated Lucide icon set (same names as @kit Icon) to SVG files for the Manim kit.
// Usage: node kit-gallery/export_icons.mjs  →  elucera/render/manim_assets/icons/<Name>.svg
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as lucide from "lucide-react";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "../src/kit/general/Icon.tsx"), "utf8");
const names = src.match(/const ICONS = \{([\s\S]*?)\} as const/)[1].split(",").map((s) => s.trim()).filter(Boolean);
const out = path.join(here, "../../elucera/render/manim_assets/icons");
fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const name of names) {
  const C = lucide[name];
  if (!C) { console.error("missing", name); continue; }
  const svg = renderToStaticMarkup(React.createElement(C, { size: 24, color: "#FFFFFF", strokeWidth: 2 }));
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  n++;
}
console.log(`exported ${n} icons`);
