
3D scenes:
- Wrap all 3D content in `<Scene3D orbit={0.3} cameraZ={9}>…</Scene3D>` from "@kit" (it creates the ThreeCanvas, background and lights). Overlay 2D titles/labels as normal React elements AFTER it inside the AbsoluteFill.
- Inside Scene3D use react-three-fiber JSX (`<mesh>`, `<group>`, `<sphereGeometry>`, `<boxGeometry>`, `<torusGeometry>`, `<meshStandardMaterial>`, …) and drei helpers (e.g. `Text`, `Line`, `RoundedBox`, `Sphere`, `Torus`). Do NOT use drei `OrbitControls`, `Environment`, `useGLTF`, textures or anything that loads files.
- Drive every transform from `useCurrentFrame()` — NEVER `useFrame`. Visible area at cameraZ=9 is about x ∈ [-2.3, 2.3], y ∈ [-4.2, 4.2]; keep objects within it (portrait!).
- `Molecule3D` from "@kit" draws ball-and-stick models.
- LAYOUT CONTRACT (same as 2D): ONE focal group at a time — fade the previous OUT before revealing the next. 2D overlay titles sit in the top band (above y=420px in screen space) and 3D objects stay clear of it; drei `Text` labels get clear padding and never sit behind another mesh. Keep the whole composition above the caption zone and inside the visible portrait box.
