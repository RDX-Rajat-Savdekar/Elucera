// Shared house style. Mirrored in elucera/render/manim_renderer.py (THEME).
export const theme = {
  width: 1080,
  height: 1920,
  fps: 30,
  bg: "#0B0F19",
  fg: "#F5F7FA",
  muted: "#8A93A6",
  accent: "#4CC9F0",
  accent2: "#F72585",
  accent3: "#FFD166",
  good: "#06D6A0",
  font: "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  mono: "'SF Mono', Menlo, monospace",
  // Keep content inside: top 10% and bottom 25% are reserved for captions / IG UI.
  safeTop: 192,
  safeBottom: 1440,
  panel: "#161D2E",
  line: "#34405C",
  bad: "#FF5D7A",
} as const;

/** Semantic states shared by every DSA component (and mirrored in the Manim kit). */
export const STATES = {
  default: { fill: "#161D2E", stroke: "#34405C", text: "#F5F7FA" },
  active: { fill: "#4A3B12", stroke: "#FFD166", text: "#FFD166" }, // the element being examined right now
  compare: { fill: "#10394A", stroke: "#4CC9F0", text: "#F5F7FA" }, // being compared / read
  swap: { fill: "#4A1033", stroke: "#F72585", text: "#F5F7FA" }, // being moved / written
  done: { fill: "#0D3B30", stroke: "#06D6A0", text: "#F5F7FA" }, // finalised (sorted, processed)
  found: { fill: "#06D6A0", stroke: "#06D6A0", text: "#0B0F19" }, // the answer
  visited: { fill: "#252F47", stroke: "#5A6B91", text: "#C9D0DC" },
  frontier: { fill: "#161D2E", stroke: "#4CC9F0", text: "#4CC9F0" }, // queued / next to explore
  path: { fill: "#FFD166", stroke: "#FFD166", text: "#0B0F19" }, // part of the chosen path
  dim: { fill: "#0E1320", stroke: "#222A3D", text: "#5D6678" }, // ruled out / outside the window
  error: { fill: "#4A1520", stroke: "#FF5D7A", text: "#FF5D7A" }, // invalid / conflict
} as const;
export type State = keyof typeof STATES;
