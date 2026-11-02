// Optional Three.js background: a slowly orbiting "knowledge graph" of glowing nodes and links.
// It speeds up and pulses while reels are being made, and bursts when one finishes.
// Toggled by the 3D button; the preference is remembered per browser.

import * as THREE from "/vendor/three/three.module.js";

const PREF_KEY = "elucera.bg3d";
const canvas = document.getElementById("bg");
const buttons = [...document.querySelectorAll("[data-toggle3d]")];
const COLORS = [0x4cc9f0, 0xf72585, 0xffd166, 0x06d6a0].map((c) => new THREE.Color(c));

let state = null; // live scene objects while enabled
let activity = 0; // 0 idle → 1 busy (eased)
let activeJobs = 0;
let burst = 0;

function readPref() {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v !== null) return v === "1";
  } catch {}
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function writePref(on) {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch {}
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function build() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null; // no WebGL: leave the plain gradient background
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050608, 0.05);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  // Nodes: points spread on a few nested shells so it reads as a 3D graph.
  const N = 160;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const base = [];
  for (let i = 0; i < N; i++) {
    const r = 4 + Math.random() * 5.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const v = new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.8, r * Math.cos(ph));
    base.push(v);
    v.toArray(pos, i * 3);
    const c = COLORS[i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : i % 11 === 0 ? 3 : 0];
    c.toArray(col, i * 3);
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  nodeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const nodeMat = new THREE.PointsMaterial({
    size: 0.55, map: glowTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const nodes = new THREE.Points(nodeGeo, nodeMat);

  // Links between near neighbours.
  const linkPos = [];
  const linkCol = [];
  for (let i = 0; i < N; i++) {
    let links = 0;
    for (let j = i + 1; j < N && links < 3; j++) {
      if (base[i].distanceTo(base[j]) < 2.6) {
        linkPos.push(...base[i].toArray(), ...base[j].toArray());
        const a = COLORS[0];
        linkCol.push(a.r, a.g, a.b, a.r, a.g, a.b);
        links++;
      }
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.Float32BufferAttribute(linkCol, 3));
  const linkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  const links = new THREE.LineSegments(linkGeo, linkMat);

  // A travelling "signal" ring that sweeps outward when a segment finishes.
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 96), ringMat);

  const group = new THREE.Group();
  group.add(nodes, links, ring);
  scene.add(group);

  const mouse = new THREE.Vector2();
  const onMove = (e) => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  addEventListener("pointermove", onMove);

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < h ? 22 : 16; // portrait screens: pull back so the graph fits
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  let raf = 0;
  let last = performance.now();
  let angle = 0;
  let ringT = 1;
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = activeJobs > 0 ? 1 : 0;
    activity += (target - activity) * Math.min(1, dt * 1.5);
    burst = Math.max(0, burst - dt * 0.8);

    angle += dt * (0.05 + activity * 0.35 + burst * 1.2);
    group.rotation.y = angle;
    group.rotation.x = Math.sin(angle * 0.4) * 0.15 + mouse.y * 0.25;
    group.rotation.z = mouse.x * 0.1;

    const t = now / 1000;
    const p = nodeGeo.attributes.position.array;
    const amp = 0.15 + activity * 0.35 + burst * 1.5;
    for (let i = 0; i < N; i++) {
      const b = base[i];
      const k = 1 + Math.sin(t * (1.2 + activity * 2) + i * 0.7) * 0.02 * amp * 4;
      p[i * 3] = b.x * k;
      p[i * 3 + 1] = b.y * k;
      p[i * 3 + 2] = b.z * k;
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeMat.size = 0.5 + activity * 0.15 + burst * 0.5 + Math.sin(t * 3) * 0.05 * activity;
    linkMat.opacity = 0.12 + activity * 0.12 + burst * 0.3;

    if (ringT < 1) {
      ringT = Math.min(1, ringT + dt * 0.7);
      ring.scale.setScalar(1 + ringT * 10);
      ringMat.opacity = (1 - ringT) * 0.55;
      ring.rotation.x = Math.PI / 2.4;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    pulse(color) {
      ringMat.color.set(color);
      ringT = 0;
    },
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      nodeGeo.dispose(); linkGeo.dispose(); nodeMat.map.dispose(); nodeMat.dispose(); linkMat.dispose();
      ring.geometry.dispose(); ringMat.dispose();
      renderer.dispose();
    },
  };
}

function setEnabled(on) {
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(on)));
  if (on && !state) {
    state = build();
    if (!state) {
      buttons.forEach((b) => {
        b.setAttribute("aria-pressed", "false");
        b.disabled = true;
        b.title = "3D needs WebGL, which isn't available in this browser";
      });
      return;
    }
    canvas.classList.add("on");
  } else if (!on && state) {
    canvas.classList.remove("on");
    const s = state;
    state = null;
    setTimeout(() => s.dispose(), 800); // let the fade-out finish
  }
}

buttons.forEach((b) => b.addEventListener("click", () => {
  const on = b.getAttribute("aria-pressed") !== "true";
  writePref(on);
  setEnabled(on);
}));

addEventListener("reel:activity", (e) => {
  activeJobs = e.detail.active;
  if (!state) return;
  if (e.detail.kind === "pulse") state.pulse(0x4cc9f0);
  if (e.detail.kind === "done") { burst = 1; state.pulse(0x06d6a0); }
  if (e.detail.kind === "error") state.pulse(0xf72585);
});

setEnabled(readPref());
