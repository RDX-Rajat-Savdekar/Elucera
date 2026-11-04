// Usage: node validate.mjs Scene.tsx
// Static checks for LLM-written scenes: import allowlist, banned non-deterministic APIs, and a compile.
// Prints {ok: true} or {ok: false, error}.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED = new Set(["react", "remotion", "@remotion/three", "three", "@react-three/fiber", "@react-three/drei", "@kit"]);
const BANNED = [
  [/\bsetTimeout\b|\bsetInterval\b/, "setTimeout/setInterval (animate with useCurrentFrame instead)"],
  [/\brequestAnimationFrame\b/, "requestAnimationFrame (animate with useCurrentFrame instead)"],
  [/\bDate\.now\b|\bnew Date\b|performance\.now/, "wall-clock time (use useCurrentFrame)"],
  [/Math\.random/, "Math.random (use random(seed) from remotion)"],
  [/\buseFrame\b/, "useFrame from @react-three/fiber (drive 3D with useCurrentFrame)"],
  // A first gate against honest mistakes, not a sandbox (regexes can't contain JS); see README "Safety model".
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|importScripts|\b(?:Shared)?Worker\s*\(/, "network / dynamic import"],
  [/new\s+Image\b|<iframe|window\.open\s*\(|\blocation\s*(?:\.\s*href\s*)?=/, "loading other pages or URLs"],
  [/document\.cookie|localStorage|sessionStorage|indexedDB|window\.(?:parent|top|opener)\b/, "browser storage / other windows"],
  [/\beval\s*\(|new Function\b/, "eval"],
  [/@keyframes|animation\s*:/, "CSS animations (animate with useCurrentFrame)"],
];

const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const errors = [];
for (const [re, why] of BANNED) if (re.test(src)) errors.push(`Banned: ${why}`);
if (!/export\s+default\b/.test(src)) errors.push("Scene must `export default` its component.");

const allowlist = {
  name: "allowlist",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === "entry-point") return;
      const pkg = args.path.startsWith("@") ? args.path.split("/").slice(0, 2).join("/") : args.path.split("/")[0];
      if (!ALLOWED.has(pkg)) {
        errors.push(`Import not allowed: "${args.path}". Allowed: ${[...ALLOWED].join(", ")}`);
      }
      return { path: args.path, external: true };
    });
  },
};

try {
  await build({ entryPoints: [file], bundle: true, write: false, jsx: "automatic", format: "esm", logLevel: "silent", plugins: [allowlist] });
} catch (e) {
  for (const m of e.errors ?? [e]) {
    const loc = m.location ? `line ${m.location.line}:${m.location.column}: ` : "";
    errors.push(`${loc}${m.text ?? m.message}${m.location?.lineText ? `\n    ${m.location.lineText}` : ""}`);
  }
}
// Type-check a copy inside the project so modules and @kit types resolve. Catches wrong kit props.
if (!errors.length) {
  const dir = path.join(here, ".checks", randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, "Scene.tsx"));
  fs.writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({ extends: "../../tsconfig.json", compilerOptions: { baseUrl: "../.." }, files: ["Scene.tsx"], include: [] }),
  );
  try {
    execFileSync(path.join(here, "node_modules/.bin/tsc"), ["-p", dir], { encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    const out = String(e.stdout || e.message).replaceAll(dir + "/", "").split("\n").filter((l) => l.trim()).slice(0, 15);
    errors.push(...out.map((l) => l.replace(/^.*Scene\.tsx/, "Scene.tsx")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
console.log(JSON.stringify(errors.length ? { ok: false, error: errors.join("\n") } : { ok: true }));
