// Elucera web UI: a home page of samples from the library, and a studio where each request streams
// structured events (stages, script, voice, per-scene attempts and errors) from /jobs/{id}/events.

const SUGGESTIONS = [
  "How does the TCP handshake work?",
  "Why is quicksort fast?",
  "How does DNA store data?",
  "What makes a black hole black?",
  "How does public-key encryption work?",
  "Why does ice float?",
  "How do vaccines train the immune system?",
  "What is a hash table really doing?",
  "How does GPS know where you are?",
  "Why is the sky blue?",
];

// One-time migration of browser state saved under the product's old name (chats, theme, background pref).
try {
  for (const k of ["uid", "thread", "chat.v2", "theme", "bg3d"]) {
    const old = localStorage.getItem(`reel${"gen"}.${k}`);
    if (old !== null && localStorage.getItem(`elucera.${k}`) === null) localStorage.setItem(`elucera.${k}`, old);
  }
} catch { /* storage unavailable */ }
const RENDERER = { manim: "Manim", remotion: "2D motion", three: "3D", seek: "Seek doodle" };
const STAGES = [
  ["script", "Script"],
  ["voice", "Voice"],
  ["align", "Word sync"],
  ["plan", "Direct"],
  ["render", "Animate"],
  ["assemble", "Assemble"],
];
const STORE_KEY = "elucera.chat.v2";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

// Anonymous per-browser id: the server files chats under it, so history survives reloads without a login.
const UID = (() => {
  const make = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24);
  try {
    let u = localStorage.getItem("elucera.uid");
    if (!u) { u = make(); localStorage.setItem("elucera.uid", u); }
    return u;
  } catch { return make(); }
})();

async function getJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), "X-Elucera-User": UID } });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw Object.assign(new Error(detail), { status: res.status });
  }
  return res.status === 204 ? null : res.json();
}
const postJSON = (url, body = {}) => getJSON(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ---------- product telemetry (best-effort, local-first, never blocks UI) ----------
const _trackedOnce = new Set();
function track(event, props = {}, opts = {}) {
  try {
    if (opts.once) {
      const k = `${event}:${opts.once}`;
      if (_trackedOnce.has(k)) return;
      _trackedOnce.add(k);
    }
    const body = JSON.stringify({ event, props: { ...props, route: location.hash || "#/" } });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      // sendBeacon doesn't send custom headers; UID travels in the payload for beacon path.
      if (navigator.sendBeacon("/telemetry/event?uid=" + encodeURIComponent(UID), blob)) return;
    }
    fetch("/telemetry/event", { method: "POST", headers: { "Content-Type": "application/json", "X-Elucera-User": UID }, body, keepalive: true }).catch(() => {});
  } catch { /* telemetry never breaks the UI */ }
}

// ---------- theme: system → light → dark ----------
const THEMES = ["system", "light", "dark"];
const THEME_ICON = {
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>`,
  light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
};
let theme = (() => { try { return localStorage.getItem("elucera.theme") || "system"; } catch { return "system"; } })();
function applyTheme(t) {
  theme = THEMES.includes(t) ? t : "system";
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("elucera.theme", theme); } catch {}
  for (const b of document.querySelectorAll("[data-theme-toggle]")) {
    b.innerHTML = THEME_ICON[theme];
    b.title = `Theme: ${theme} (click to switch)`;
    b.setAttribute("aria-label", b.title);
  }
}
applyTheme(theme);
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
});

// Word-level diff (LCS) for showing exactly how a scene prompt changed.
function wordDiff(a, b) {
  const x = String(a || "").split(/(\s+)/), y = String(b || "").split(/(\s+)/);
  if (x.length * y.length > 400000) return `<del>${esc(a)}</del>\n<ins>${esc(b)}</ins>`;
  const m = x.length, n = y.length, L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < m && j < n) {
    if (x[i] === y[j]) { out += esc(x[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out += `<del>${esc(x[i++])}</del>`;
    else out += `<ins>${esc(y[j++])}</ins>`;
  }
  while (i < m) out += `<del>${esc(x[i++])}</del>`;
  while (j < n) out += `<ins>${esc(y[j++])}</ins>`;
  return out.replace(/<\/del><del>/g, "").replace(/<\/ins><ins>/g, "");
}
const STAGE_LABEL = { script: "Script", voice: "Voice", align: "Word sync", plan: "Direct", render: "Animate", assemble: "Assemble" };

// ---------- guided flow bar: which of the 5 steps you're on, and what happens now ----------
function updateFlow() {
  const last = [...views.values()].pop();
  const f = last?.flow?.() || { step: 1, hint: "<b>Describe</b> what you want explained. You'll get a storyboard to review before anything is recorded or animated." };
  for (const li of document.querySelectorAll("#flow li")) {
    const n = +li.dataset.step;
    li.className = n < f.step ? "done" : n === f.step ? (f.warn ? "now warn" : "now") : "";
    if (n === f.step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  }
  const h = document.getElementById("flowHint");
  if (h) h.innerHTML = f.hint;
}

function loadChat() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
function saveChat() { try { localStorage.setItem(STORE_KEY, JSON.stringify(chat.slice(-30))); } catch {} }
let chat = loadChat();

// Background (bg3d.js) reacts to activity.
const activeJobs = new Set();
const signal = (kind) => window.dispatchEvent(new CustomEvent("reel:activity", { detail: { kind, active: activeJobs.size } }));

// Play muted previews only while they're on screen.
const autoplay = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }
}, { threshold: 0.25 });
const watch = (root) => $$("video[data-auto]", root).forEach((v) => autoplay.observe(v));

// =====================================================================
// Router
// =====================================================================
function route() {
  const h = location.hash || "#/";
  const job = h.match(/^#\/job\/([a-z0-9]+)/i);
  const studio = h.startsWith("#/create") || !!job;
  const analytics = h.startsWith("#/analytics");
  $("#home").hidden = studio || analytics;
  $("#studio").hidden = !studio;
  $("#analytics").hidden = !analytics;
  document.title = studio ? "Studio · Elucera" : analytics ? "Analytics · Elucera" : "Elucera: understand anything in 60 seconds";
  if (studio) openStudio(job?.[1]);
  else if (analytics) { loadAnalytics(); window.scrollTo(0, 0); }
  else { loadHome(); window.scrollTo(0, 0); }
  track("page_view", { view: analytics ? "analytics" : studio ? "studio" : "home" });
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-scroll]");
  if (!a) return;
  e.preventDefault();
  $(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function goCreate(prefill = "") {
  pendingPrefill = prefill;
  if (location.hash.startsWith("#/create")) applyPrefill();
  else location.hash = "#/create";
}
let pendingPrefill = "";
function applyPrefill() {
  if (!pendingPrefill) return;
  input.value = pendingPrefill;
  pendingPrefill = "";
  autosize(); updateSend(); input.focus();
}

// =====================================================================
// Home
// =====================================================================
let homeLoaded = false;
let reels = [];

async function loadHome() {
  if (homeLoaded) return;
  homeLoaded = true;
  const [reelsRes, kitsRes, enginesRes] = await Promise.allSettled([getJSON("/library/reels"), getJSON("/library/showcase"), getJSON("/library/engines")]);
  reels = reelsRes.status === "fulfilled" ? reelsRes.value : [];
  const kits = kitsRes.status === "fulfilled" ? kitsRes.value : [];
  const engines = enginesRes.status === "fulfilled" ? enginesRes.value : [];

  // hero: three phones from the best reels
  const playable = reels.filter((r) => r.has_video).slice(0, 3);
  const order = playable.length === 3 ? [playable[1], playable[0], playable[2]] : playable;
  $("#heroPhones").innerHTML = order.map((r) => `
    <div class="phone">
      <video data-auto data-src="/library/reels/${encodeURIComponent(r.name)}/video" muted loop playsinline preload="none"></video>
    </div>`).join("") || `<div class="phone"><div class="phone-empty">Your first reel will appear here.</div></div>`;

  // gallery: reels only, clean cards
  $("#reelsGrid").innerHTML = reels.filter((r) => r.has_video).map((r, i) => `
    <button class="reel-card" type="button" data-reel="${reels.indexOf(r)}" aria-label="Watch: ${esc(r.title)}">
      <video data-auto data-src="/library/reels/${encodeURIComponent(r.name)}/video#t=0.5" muted loop playsinline preload="none"></video>
      <div class="shade"></div>
      ${r.duration ? `<span class="dur">${fmt(r.duration)}</span>` : ""}
      <div class="meta">
        <strong>${esc(r.title)}</strong>
        <span class="tags">${r.renderers.map((x) => esc(RENDERER[x] || x)).join(" · ")}</span>
      </div>
    </button>`).join("");
  $("#reelsGrid").onclick = (e) => {
    const card = e.target.closest("[data-reel]");
    if (card) openPlayer(reels[+card.dataset.reel]);
  };

  // component kits: the two showreels
  $("#kitGrid").innerHTML = kits.filter((k) => k.has_video).map((k) => `
    <article class="kit">
      <button class="kit-video" type="button" data-kit="${esc(k.id)}" aria-label="Watch: ${esc(k.title)}">
        <video data-auto data-src="/library/showcase/${encodeURIComponent(k.id)}/video" poster="/library/showcase/${encodeURIComponent(k.id)}/poster" muted loop playsinline preload="none"></video>
        <span class="play" aria-hidden="true"></span>
      </button>
      <div class="kit-body">
        <span class="kit-engine">${esc(k.engine === "manim" ? "Manim" : k.engine === "three" ? "3D" : "Remotion · 2D & 3D")}</span>
        <h3>${esc(k.title)}</h3>
        <p>${esc(k.summary)}</p>
        <span class="kit-count">${k.components} components</span>
      </div>
    </article>`).join("") || `<p class="muted">Showreels appear here once they're rendered.</p>`;
  $("#kitGrid").onclick = (e) => {
    const b = e.target.closest("[data-kit]");
    if (!b) return;
    const k = kits.find((x) => x.id === b.dataset.kit);
    if (k) openPlayer({ title: k.title, has_video: true, src: `/library/showcase/${encodeURIComponent(k.id)}/video`, kit: true });
  };

  // engines: one signature clip per renderer (seek slot fills in once its clip renders)
  $("#engineGrid").innerHTML = engines.filter((k) => k.has_video).map((k) => `
    <article class="kit">
      <button class="kit-video" type="button" data-engine="${esc(k.id)}" aria-label="Watch: ${esc(k.title)}">
        <video data-auto data-src="/library/engines/${encodeURIComponent(k.id)}/video" poster="/library/engines/${encodeURIComponent(k.id)}/poster" muted loop playsinline preload="none"></video>
        <span class="play" aria-hidden="true"></span>
      </button>
      <div class="kit-body">
        <span class="kit-engine">${esc(k.title)}</span>
        <h3>${esc(k.title)}</h3>
        <p>${esc(k.summary)}</p>
      </div>
    </article>`).join("") || `<p class="muted">Engine clips appear here once they're rendered.</p>`;
  $("#engineGrid").onclick = (e) => {
    const b = e.target.closest("[data-engine]");
    if (!b) return;
    const k = engines.find((x) => x.id === b.dataset.engine);
    if (k) { track("engine_play", { engine: k.id }); openPlayer({ title: k.title, has_video: true, src: `/library/engines/${encodeURIComponent(k.id)}/video`, kit: true }); }
  };

  watch($("#home"));
  initLiveDemo();
}

function openPlayer(r) {
  if (!r) return;
  if (!r.has_video) { goCreate(r.topic); return; }
  track(r.kit ? "kit_play" : "reel_play", { title: (r.title || "").slice(0, 120) });
  const dlg = $("#player");
  $("#playerVideo").src = r.src || `/library/reels/${encodeURIComponent(r.name)}/video`;
  $("#playerTitle").textContent = r.title;
  $("#playerMake").hidden = !!r.kit;
  $("#playerMake").onclick = () => { track("cta_make_like_this", { title: (r.title || "").slice(0, 120) }); dlg.close(); goCreate(r.topic); };
  dlg.showModal();
  $("#playerVideo").play().catch(() => {});
}
$("#player").addEventListener("close", () => $("#playerVideo").pause());

// =====================================================================
// Home: live build demo (typed prompt + pipeline canvas, loops like n8n)
// =====================================================================
const DEMO_SCENARIOS = [
  {
    prompt: "Explain how GPS knows where you are in 45 seconds",
    built: "Built — script → voice → 3 scenes → captioned reel",
    caption: "GPS reel · script, voice and scenes build below",
    nodes: [
      { icon: "❓", cls: "", title: "New question", sub: "How does GPS work?" },
      { icon: "✎", cls: "amber", title: "Script", sub: "hook · mechanism · payoff" },
      { icon: "♪", cls: "lime", title: "Voice", sub: "45s · word timings" },
      { icon: "▦", cls: "", title: "Plan", sub: "3 scenes picked" },
      { icon: "▶", cls: "green", title: "Animate", sub: "2D + 3D rendering" },
    ],
    ends: [
      { icon: "✓", cls: "green", title: "Reel ready", sub: "1080×1920 + captions" },
      { icon: "↻", cls: "pink", title: "Redo a scene", sub: "note → rebake" },
    ],
  },
  {
    prompt: "Why is quicksort fast? Show the partitions",
    built: "Done — storyboard approved → scenes rendering live",
    caption: "Quicksort reel · same pipeline, different scenes",
    nodes: [
      { icon: "❓", cls: "", title: "New question", sub: "Why is quicksort fast?" },
      { icon: "✎", cls: "amber", title: "Script", sub: "pivot · partition · recurse" },
      { icon: "♪", cls: "lime", title: "Voice", sub: "52s · Puck voice" },
      { icon: "▦", cls: "", title: "Plan", sub: "Manim for partitions" },
      { icon: "▶", cls: "green", title: "Animate", sub: "bars swap live" },
    ],
    ends: [
      { icon: "✓", cls: "green", title: "Reel ready", sub: "captions burned in" },
      { icon: "↻", cls: "pink", title: "Redo a scene", sub: "compare → rebake" },
    ],
  },
];
let _demoInit = false, _demoTimers = [], _demoIdx = 0, _demoVisible = false, _demoReduced = false;
function demoClearTimers() { for (const t of _demoTimers) clearTimeout(t); _demoTimers = []; }
const _demoLater = (ms, fn) => _demoTimers.push(setTimeout(fn, ms));
function demoDrawEdges() {
  const svg = $("#demoEdges"), canvas = $("#demoCanvas"), box = $("#demoNodes");
  if (!svg || !canvas || !box) return;
  if (innerWidth < 900) { svg.innerHTML = ""; return; }
  const cr = canvas.getBoundingClientRect();
  const center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2, w: r.width, h: r.height };
  };
  const link = (a, b) => {
    const x1 = a.x + a.w / 2, x2 = b.x - b.w / 2;
    const mx = (x1 + x2) / 2;
    return `<path d="M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}"/>`;
  };
  const mains = [...box.querySelectorAll(".demo-col.main .demo-node.show")].map(center);
  const ends = [...box.querySelectorAll(".demo-col.ends .demo-card.show")].map(center);
  if (!mains.length) { svg.innerHTML = ""; return; }
  svg.setAttribute("viewBox", `0 0 ${cr.width} ${cr.height}`);
  let html = "";
  for (let i = 0; i + 1 < mains.length; i++) html += link(mains[i], mains[i + 1]);
  if (mains.length && ends.length) {
    const tail = mains[mains.length - 1];
    for (const e of ends) html += link(tail, e);
  }
  svg.innerHTML = html;
}
function demoRenderDots() {
  const d = $("#demoDots");
  if (d) d.innerHTML = DEMO_SCENARIOS.map((_, i) => `<i class="${i === _demoIdx ? "on" : ""}"></i>`).join("");
}
function demoPlayScenario(idx) {
  const sc = DEMO_SCENARIOS[idx % DEMO_SCENARIOS.length];
  _demoIdx = idx % DEMO_SCENARIOS.length;
  const typed = $("#demoTyped"), built = $("#demoBuilt"), builtText = $("#demoBuiltText");
  const nodes = $("#demoNodes"), caption = $("#demoCaption"), live = $("#demoLive"), caret = $("#demoCaret");
  const send = document.querySelector(".demo-send");
  if (!typed || !nodes) return;
  demoClearTimers();
  demoRenderDots();
  // reset
  typed.textContent = "";
  if (built) built.hidden = true;
  if (caret) caret.classList.remove("off");
  if (live) live.classList.add("on");
  if (send) send.classList.remove("ready");
  nodes.innerHTML = "";
  const svg = $("#demoEdges");
  if (svg) svg.innerHTML = "";
  if (caption) caption.textContent = "Typing…";
  track("demo_scenario", { index: _demoIdx });
  if (_demoReduced) {
    typed.textContent = sc.prompt;
    if (built && builtText) { builtText.textContent = sc.built; built.hidden = false; }
    if (caret) caret.classList.add("off");
    if (send) send.classList.add("ready");
    if (caption) caption.textContent = sc.caption;
    // show everything at once
    sc.nodes.forEach((n) => nodes.append(demoNodeEl(n)));
    nodes.append(demoEndsEl(sc.ends));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      nodes.querySelectorAll(".demo-node, .demo-card").forEach((el) => el.classList.add("show"));
      demoDrawEdges();
    }));
    if (live) live.classList.remove("on");
    return;
  }
  // type the prompt
  let ci = 0;
  const typeStep = () => {
    if (!_demoVisible) return;
    typed.textContent = sc.prompt.slice(0, ++ci);
    if (ci < sc.prompt.length) _demoLater(34 + Math.random() * 46, typeStep);
    else {
      if (caret) caret.classList.add("off");
      if (send) send.classList.add("ready");
      _demoLater(550, () => {
        if (!_demoVisible) return;
        if (built && builtText) { builtText.textContent = sc.built; built.hidden = false; }
        if (caption) caption.textContent = "Building the pipeline…";
        // reveal the chain one node at a time, then the two end cards together
        sc.nodes.forEach((n, i) => _demoLater(600 * (i + 1), () => {
          if (!_demoVisible) return;
          nodes.append(demoNodeEl(n));
          demoDrawEdges();
          _demoLater(450, demoDrawEdges); // settle after the pop-in transition
        }));
        const forkAt = 600 * (sc.nodes.length + 1);
        _demoLater(forkAt, () => {
          if (!_demoVisible) return;
          nodes.append(demoEndsEl(sc.ends));
          demoDrawEdges();
          _demoLater(500, demoDrawEdges);
          if (caption) caption.textContent = sc.caption;
        });
        _demoLater(forkAt + 4200, () => { if (_demoVisible) demoPlayScenario(idx + 1); });
        _demoLater(600 * 2, () => { if (live) live.classList.remove("on"); });
      });
    }
  };
  typeStep();
}
function demoNodeEl(n) {
  const col = document.createElement("div");
  col.className = "demo-col main";
  col.innerHTML = `<div class="demo-node"><span class="demo-ico ${esc(n.cls || "")}">${esc(n.icon || "•")}</span><span class="demo-txt">${esc(n.title)}<small>${esc(n.sub || "")}</small></span></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    col.firstElementChild?.classList.add("show");
    demoDrawEdges();
  }));
  return col;
}
function demoEndsEl(ends) {
  const col = document.createElement("div");
  col.className = "demo-col ends";
  col.innerHTML = (ends || []).map((n) => `<div class="demo-card mini"><strong><span class="demo-ico ${esc(n.cls || "")}">${esc(n.icon || "•")}</span>${esc(n.title)}</strong><p>${esc(n.sub || "")}</p></div>`).join("");
  const cards = [...col.children];
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cards.forEach((c, i) => setTimeout(() => { c.classList.add("show"); demoDrawEdges(); }, i * 160));
  }));
  return col;
}
function initLiveDemo() {
  if (_demoInit) return;
  const root = $("#liveDemo");
  if (!root) return;
  _demoInit = true;
  _demoReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#demoReplay")?.addEventListener("click", () => { track("demo_replay", { index: _demoIdx }); demoPlayScenario(0); });
  new IntersectionObserver((entries) => {
    const vis = entries.some((e) => e.isIntersecting);
    if (vis && !_demoVisible) {
      _demoVisible = true;
      track("demo_view", {}, { once: "demo" });
      demoPlayScenario(_demoIdx);
    } else if (!vis && _demoVisible) {
      _demoVisible = false;
      demoClearTimers();
    }
  }, { threshold: 0.25 }).observe(root);
  addEventListener("resize", () => { if (_demoVisible) demoDrawEdges(); });
}

// =====================================================================
// Studio
// =====================================================================
const thread = $("#thread");
const threadWrap = $("#threadWrap");
const form = $("#form");
const input = $("#input");
const send = $("#send");
const engineWrap = $("#engineWrap");
const engineBtn = $("#engineBtn");
const engineMenu = $("#engineMenu");
const engineLabel = $("#engineLabel");
let engineValue = "";
function directLength() {
  const r = document.querySelector('input[name="dlength"]:checked');
  return r ? r.value : "standard";
}
function syncDirectLabel() {
  const names = { short: "Short", standard: "Standard", deep: "Deep" };
  const b = $("#directBtn");
  if (b) b.textContent = `Direct: ${engineLabel.textContent} · ${names[directLength()] || "Standard"}`;
}
function setEngine(v, name, logo) {
  engineValue = v;
  engineLabel.textContent = name;
  for (const r of $$('input[name="dengine"]')) r.checked = (r.value === v);
  syncDirectLabel();
  const slot = $(".eng-logo", engineBtn);
  const src = $(`.eng-menu > button[data-v="${CSS.escape(v)}"] .eng-logo`, engineWrap);
  if (slot && src) slot.setAttribute("data-logo", logo);
  for (const b of $$(".eng-menu > button", engineWrap)) b.setAttribute("aria-selected", String(b.dataset.v === v));
  engineBtn.setAttribute("aria-label", `Animation engine: ${name}`);
}
function placeMenu(menu, anchor, dir) {
  // Hoist to body + fixed positioning: escapes every ancestor clip/stacking context.
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  menu.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = Math.min(280, innerWidth - 16);
  menu.style.minWidth = Math.min(248, innerWidth - 16) + "px";
  menu.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
  menu.style.bottom = "auto";
  if (dir === "up") menu.style.top = Math.max(8, r.top - menu.offsetHeight - 10) + "px";
  else menu.style.top = Math.min(innerHeight - 16, r.bottom + 10) + "px";
}
function engineOpen(open) {
  if (open) placeMenu(engineMenu, engineBtn, "up");
  else engineMenu.hidden = true;
  engineBtn.setAttribute("aria-expanded", String(open));
}
function repositionMenus() {
  if (!engineMenu.hidden && engineBtn) placeMenu(engineMenu, engineBtn, "up");
  const demoBtn = $("#demoBtn"), demoMenu = $("#demoMenu");
  if (demoBtn && demoMenu && !demoMenu.hidden) placeMenu(demoMenu, demoBtn, "down");
}
addEventListener("resize", repositionMenus);
threadWrap?.addEventListener("scroll", () => { engineOpen(false); const m = $("#demoMenu"); if (m) m.hidden = true; }, { passive: true });
engineBtn?.addEventListener("click", (e) => { e.stopPropagation(); engineOpen(engineMenu.hidden); });
engineMenu?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-v]");
  if (!b) return;
  setEngine(b.dataset.v, b.dataset.name, b.dataset.logo);
  const svg = $("svg", $(".eng-logo", engineBtn));
  if (svg && b.dataset.logo) {
    const menuSvg = $("svg", $(`.eng-logo[data-logo="${b.dataset.logo}"]`, b));
    if (menuSvg) $(".eng-logo", engineBtn).innerHTML = menuSvg.outerHTML;
  }
  engineOpen(false);
  input.focus();
});
document.addEventListener("click", (e) => { if (!e.target.closest("#engineWrap")) engineOpen(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") engineOpen(false); });
const views = new Map(); // jobId → JobView
let studioReady = false;

function openStudio(jobId) {
  if (!studioReady) {
    studioReady = true;
    $("#studioChips").innerHTML = SUGGESTIONS.slice(0, 6).map((s) => `<button class="chip" type="button">${esc(s)}</button>`).join("");
    $("#studioChips").onclick = (e) => { const c = e.target.closest(".chip"); if (c) { input.value = c.textContent; autosize(); updateSend(); input.focus(); } };
    hydrate();
  }
  if (jobId && !views.has(jobId)) {
    getJSON(`/jobs/${jobId}`).then((job) => {
      chat.push({ jobId: job.id, topic: job.topic, renderer: job.preferred_renderer || undefined });
      saveChat();
      mountJob(job.id, job.topic, job.preferred_renderer || undefined);
      views.get(job.id)?.el.scrollIntoView({ block: "start" });
    }).catch(() => {});
  } else if (jobId) {
    views.get(jobId)?.el.scrollIntoView({ block: "start" });
  }
  applyPrefill();
  if (!pendingPrefill) input.focus();
}

// Server is the source of truth for the current chat; the localStorage copy is only an offline fallback.
const chatKey = (c) => (c.pitchId ? `p:${c.pitchId}` : `j:${c.jobId}`);
const toChatItem = (i) => (i.kind === "pitch" ? { pitchId: i.id, topic: i.topic, renderer: i.renderer || undefined }
                                               : { jobId: i.id, topic: i.topic, renderer: i.renderer || undefined });
function storedThread() { try { return localStorage.getItem("elucera.thread"); } catch { return null; } }
function mountItem(item) {
  if (item.pitchId) mountPitch(item.pitchId, item.topic, item.renderer);
  else mountJob(item.jobId, item.topic, item.renderer);
}
async function hydrate() {
  const tid = storedThread();
  if (tid) {
    try {
      // Only fetch threads the server knows for this browser (a brand-new chat isn't saved until its first pitch).
      const mine = await getJSON("/chats");
      if (!mine.some((x) => x.id === tid)) throw new Error("new chat");
      const t = await getJSON(`/chats/${encodeURIComponent(tid)}`);
      const items = t.items.map(toChatItem);
      const known = new Set(items.map(chatKey));
      for (const c of chat) if (!known.has(chatKey(c)) && c.jobId) items.push(c); // e.g. a shared #/job link
      chat = items;
      saveChat();
    } catch { /* offline or new chat: fall back to the local copy */ }
  }
  for (const item of chat) mountItem(item);
  updateFlow();
}

// Autoscroll: follow new activity while the reader is at the bottom; stop following once they scroll up.
let pinned = true;
const latestBtn = document.createElement("button");
latestBtn.type = "button"; latestBtn.className = "latest"; latestBtn.hidden = true; latestBtn.textContent = "↓ Latest";
latestBtn.onclick = () => { pinned = true; latestBtn.hidden = true; threadWrap.scrollTo({ top: threadWrap.scrollHeight, behavior: "smooth" }); };
threadWrap.append(latestBtn);
threadWrap.addEventListener("scroll", () => {
  pinned = threadWrap.scrollHeight - threadWrap.scrollTop - threadWrap.clientHeight < 140;
  if (pinned) latestBtn.hidden = true;
}, { passive: true });
function follow() {
  if (pinned) requestAnimationFrame(() => { threadWrap.scrollTop = threadWrap.scrollHeight; });
  else latestBtn.hidden = false;
}
function scrollDown() { pinned = true; follow(); }

function addUser(text, renderer) {
  $("#studioEmpty")?.remove();
  const el = document.createElement("div");
  el.className = "msg user";
  el.innerHTML = `<div class="bubble">${esc(text)}${renderer ? ` <span class="tag" data-r="${esc(renderer)}">${esc(RENDERER[renderer] || renderer)}</span>` : ""}</div>`;
  thread.append(el);
}

function mountJob(jobId, topic, renderer) {
  if (views.has(jobId)) return;
  addUser(topic, renderer);
  const el = document.createElement("div");
  el.className = "msg bot";
  thread.append(el);
  views.set(jobId, new JobView(el, jobId, topic));
  scrollDown();
}

async function submit(topic) {
  topic = topic.trim();
  if (topic.length < 3) return;
  const renderer = engineValue || undefined;
  const target_length = directLength();
  track("pitch_submit", { len: topic.length, engine: renderer || "auto", target_length });
  input.value = ""; autosize(); updateSend();
  try {
    const body = { topic, thread_id: getThreadId(), target_length };
    if (renderer) body.renderer = renderer;
    const pitch = await getJSON("/pitches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    chat.push({ pitchId: pitch.id, topic, renderer });
    saveChat();
    mountPitch(pitch.id, topic, renderer);
  } catch (e) {
    addUser(topic);
    const el = document.createElement("div");
    el.className = "msg bot";
    el.innerHTML = `<div class="bubble"><div class="failbox"><strong>Couldn't start</strong><p>${esc(e.message)}</p></div></div>`;
    thread.append(el);
    scrollDown();
  }
}

function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }
function updateSend() { send.disabled = input.value.trim().length < 3; }
form.addEventListener("submit", (e) => { e.preventDefault(); submit(input.value); });
input.addEventListener("input", () => { autosize(); updateSend(); });
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!send.disabled) submit(input.value); }
});
function getThreadId() {
  let tid = null;
  try { tid = localStorage.getItem("elucera.thread"); } catch { tid = null; }
  if (!tid) {
    tid = Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem("elucera.thread", tid); } catch { /* private mode */ }
  }
  return tid;
}
function resetThread() {
  const tid = Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem("elucera.thread", tid); } catch { /* private mode */ }
  return tid;
}

$("#newChat").onclick = () => {
  for (const v of views.values()) v.close();
  views.clear();
  chat = []; saveChat();
  resetThread();
  thread.innerHTML = `<section class="studio-empty" id="studioEmpty"><h2>What should we explain?</h2><p>Type a question or concept. You'll get a <b>storyboard</b> first: the words the narrator will say and what's on screen in each scene. Nothing is recorded or animated until you approve it.</p><div class="chips" id="studioChips"></div></section>`;
  studioReady = false;
  history.replaceState(null, "", "#/create");
  openStudio();
  updateFlow();
};

// ---------------------------------------------------------------------
// One request's live view, driven entirely by the server's event stream.
// ---------------------------------------------------------------------
class JobView {
  constructor(el, id, topic, opts = {}) {
    this.el = el;
    this.id = id;
    this.topic = topic;
    this.demo = !!opts.demo;
    this.urls = opts.urls || null;
    this.demoTimers = [];
    this.s = { stages: {}, scenes: {}, plan: null, script: null, voice: null, done: null, failed: null, t0: null, t1: null, lastSeq: -1, running: true,
               dirty: new Set(), history: {}, autoRetry: null, rebaking: false, redoing: null };
    el.innerHTML = `
      <div class="bubble">
        <div class="job-head"><span class="live">Live</span><strong>Making your reel</strong><span class="elapsed"></span></div>
        <div class="pipeline">${STAGES.map(([k, l]) => `<div class="pipe" data-stage="${k}"><span class="ic"></span>${l}</div>`).join("")}</div>
        <div class="feed" aria-label="Live log"></div>
        <div class="slot-script"></div>
        <div class="slot-voice"></div>
        <div class="scenes"></div>
        <div class="slot-rebake"></div>
        <div class="slot-final"></div>
      </div>`;
    this.feed = $(".feed", el);
    this.tick = setInterval(() => this.renderClock(), 1000);
    this.connect();
  }

  sceneClipURL(i, v) { return this.urls ? this.urls.scene(i) : `/jobs/${this.id}/scenes/${i}/clip?v=${v}`; }
  versionClipURL(i, n) { return this.urls ? this.urls.scene(i) : `/jobs/${this.id}/scenes/${i}/clip?version=${n}`; }
  finalURL(seq) { return this.urls ? this.urls.final : `/jobs/${this.id}/video?v=${seq}#t=0.8`; }
  finalDownloadURL() { return this.urls ? this.urls.final : `/jobs/${this.id}/video`; }

  connect() {
    this.es?.close();
    activeJobs.add(this.id); signal("start");
    this.s.running = true;
    if (this.demo) return; // demo views are fed canned events, no EventSource
    const es = new EventSource(`/jobs/${this.id}/events?after=${this.s.lastSeq}`);
    this.es = es;
    es.onmessage = (m) => {
      const ev = JSON.parse(m.data);
      if (ev.seq <= this.s.lastSeq) return;
      this.s.lastSeq = ev.seq;
      this.apply(ev);
    };
    es.addEventListener("end", (m) => {
      es.close();
      let status = "";
      try { status = JSON.parse(m.data).status; } catch {}
      // Jobs from before the event log have nothing to replay: trust the server's final status.
      if (status === "done" && !this.s.done) {
        this.s.done = { seq: -1, t: Date.now() / 1000, duration: "" };
        for (const [k] of STAGES) this.s.stages[k] = "done";
        getJSON(`/jobs/${this.id}/details`).then((d) => { if (d.script && !this.s.script) { this.s.script = d.script; this.render(); } }).catch(() => {});
      } else if (status === "failed" && !this.s.failed) {
        this.s.failed = { seq: -1, t: Date.now() / 1000, error: "This run stopped. Its log isn't available.", stage: "", resumable: true };
      }
      this.s.running = false;
      this.s.redoing = null;
      if (!this.s.failed) for (const [k] of STAGES) if (this.s.stages[k] === "active") this.s.stages[k] = "done";
      activeJobs.delete(this.id);
      signal(this.s.failed ? "error" : "done");
      this.render();
    });
    es.onerror = async () => {
      if (es.readyState !== EventSource.CLOSED) return; // browser will retry on its own
      try { await getJSON(`/jobs/${this.id}`); } catch (e) {
        if (e.status === 404) { this.apply({ type: "failed", t: Date.now() / 1000, error: "This job no longer exists on the server.", stage: "" }); this.s.running = false; this.render(); }
      }
    };
  }

  close() { this.es?.close(); clearInterval(this.tick); activeJobs.delete(this.id); for (const t of this.demoTimers) clearTimeout(t); this.demoTimers = []; }

  sceneLabel(i) {
    const p = this.s.plan?.find((x) => x.index === i);
    return `Scene ${i + 1}${p ? ` · ${cap(p.role)}` : ""}`;
  }

  log(ev, text, cls = "") {
    const t = this.s.t0 ? fmt(Math.max(0, ev.t - this.s.t0)) : "0:00";
    const row = document.createElement("div");
    row.innerHTML = `<time>${t}</time><span class="${cls}">${esc(text)}</span>`;
    const atBottom = this.feed.scrollTop + this.feed.clientHeight >= this.feed.scrollHeight - 8;
    this.feed.append(row);
    if (atBottom) this.feed.scrollTop = this.feed.scrollHeight;
  }

  apply(ev) {
    const s = this.s;
    s.t0 ??= ev.t;
    switch (ev.type) {
      case "queued":
        this.log(ev, "Request received — starting the pipeline");
        break;
      case "stage":
        for (const [k] of STAGES) if (s.stages[k] === "active") s.stages[k] = "done";
        s.stages[ev.stage] = "active";
        s.failed = null;
        this.log(ev, `${ev.label}…`);
        break;
      case "script":
        s.script = ev.script;
        this.log(ev, ev.approved ? `✓ Using the storyboard you approved: “${ev.script.title}” (not rewritten)`
          : ev.reused ? `♻ Reusing the finished script: “${ev.script.title}”` : `Script ready: “${ev.script.title}”`, "ok");
        break;
      case "voice":
        s.voice = ev;
        if (ev.cached) this.log(ev, `♻ Voiceover reused: narration unchanged, so the earlier ${ev.duration}s recording and word timings were reused (no new recording)`, "ok");
        else this.log(ev, `Voiceover recorded: ${ev.duration}s (${ev.provider === "gemini" ? "Gemini · Puck" : "macOS fallback voice"})`, ev.provider === "gemini" ? "ok" : "warn");
        break;
      case "plan_cached":
        this.log(ev, "♻ Scene plan reused: it was made while you reviewed the storyboard", "ok");
        break;
      case "prefetch_wait":
        this.log(ev, "Finishing the voiceover and scene plan that started while you reviewed…");
        break;
      case "auto_retry":
        s.autoRetry = ev; s.failed = null;
        this.log(ev, `⚠ Temporary problem${ev.stage ? ` during ${STAGE_LABEL[ev.stage] || ev.stage}` : ""}: ${ev.error}. Retrying automatically once (finished work is kept)…`, "warn");
        break;
      case "resume":
        s.failed = null; s.t1 = null;
        this.log(ev, `↻ Resuming from “${STAGE_LABEL[ev.stage] || ev.label}”. Everything already finished is reused.`);
        break;
      case "rebake":
        s.rebaking = true; s.failed = null; s.t1 = null;
        this.log(ev, `Rebaking the reel: stitching ${ev.scenes} scene clips with the narration and captions`);
        break;
      case "scene_redone": {
        (s.history[ev.index] ??= []).push(ev);
        s.dirty.add(ev.index); s.redoing = null;
        const sc = (s.scenes[ev.index] ??= { errors: [] });
        Object.assign(sc, { status: ev.fallback ? "fallback" : "done", renderer: ev.renderer_after, v: ev.seq, redo: false });
        if (s.plan) { const p = s.plan.find((x) => x.index === ev.index); if (p) { p.renderer = ev.renderer_after; p.description = ev.description_after; } }
        const name = this.sceneLabel(ev.index);
        if (ev.reverted_to) this.log(ev, `↩ ${name} reverted to version ${ev.reverted_to}. Rebake to use it in the reel.`, "ok");
        else {
          const what = [
            ev.renderer_before !== ev.renderer_after ? `engine ${RENDERER[ev.renderer_before]} → ${RENDERER[ev.renderer_after]}` : `kept ${RENDERER[ev.renderer_after]}`,
            ev.description_edited ? "prompt edited" : "", ev.note ? `note “${ev.note}”` : "", ev.library_scene ? `library scene ${ev.library_scene}` : "",
          ].filter(Boolean).join(" · ");
          this.log(ev, `✓ ${name} redone as version ${ev.version} (${what}). ${ev.fallback ? "Fell back to a title card." : ev.attempts ? `Rendered in ${ev.attempts} attempt${ev.attempts > 1 ? "s" : ""}.` : ""} The reel isn't updated until you rebake.`, ev.fallback ? "warn" : "ok");
        }
        break;
      }
      case "plan":
        s.plan = ev.scenes;
        for (const p of ev.scenes) s.scenes[p.index] ??= { status: "queued", renderer: p.renderer, errors: [], attempt: 0, max: 3, player: false };
        this.log(ev, `${ev.reused ? "♻ Reusing the plan for" : "Directed"} ${ev.scenes.length} scenes: ${ev.scenes.map((p) => `${cap(p.role)} → ${RENDERER[p.renderer]}`).join(", ")}`);
        break;
      case "scene": {
        const sc = (s.scenes[ev.index] ??= { status: "queued", renderer: ev.renderer, errors: [], attempt: 0, max: 3, player: false });
        Object.assign(sc, { status: ev.status, renderer: ev.renderer || sc.renderer, attempt: ev.attempt ?? sc.attempt, max: ev.max_attempts ?? sc.max, player: ev.player ?? sc.player ?? false });
        const name = this.sceneLabel(ev.index);
        const R = RENDERER[sc.renderer] || sc.renderer;
        if (ev.status === "coding") this.log(ev, `${name}: writing ${R} code (attempt ${ev.attempt}/${ev.max_attempts})`);
        else if (ev.status === "fixing") this.log(ev, `${name}: fixing the error (attempt ${ev.attempt}/${ev.max_attempts})`, "warn");
        else if (ev.status === "checking") this.log(ev, `${name}: checking the code`);
        else if (ev.status === "rendering") this.log(ev, `${name}: rendering`);
        else if (ev.status === "error") {
          sc.errors.push({ attempt: ev.attempt, stage: ev.stage, error: ev.error, detail: ev.detail });
          this.log(ev, `✕ ${name} failed while ${ev.stage}: ${ev.error}`, "err");
        } else if (ev.status === "done") {
          sc.v = ev.seq; sc.cached = !!ev.cached; sc.library = ev.library || null;
          if (ev.reused) this.log(ev, `♻ ${name} kept from the earlier run`, "ok");
          else if (ev.cached) this.log(ev, `♻ ${name} reused from cache: an identical scene was already rendered (no new code)`, "ok");
          else if (ev.library) this.log(ev, `${name}: using library scene ${ev.library}`, "ok");
          else this.log(ev, `✓ ${name} rendered${ev.attempt > 1 ? ` after ${ev.attempt} attempts` : ""}`, "ok");
        }
        else if (ev.status === "fallback_rendering") this.log(ev, `${name}: all attempts failed — making a title card instead`, "warn");
        else if (ev.status === "fallback") { sc.v = ev.seq; this.log(ev, `⚠ ${name} is using a title card`, "warn"); }
        else if (ev.status === "failed") this.log(ev, `✕ ${name} could not be rendered: ${ev.error}`, "err");
        break;
      }
      case "retry": {
        // Only this scene is rebuilt; the finished reel stays as-is until a rebake.
        s.failed = null; s.t1 = null; s.redoing = ev.index;
        const sc = (s.scenes[ev.index] ??= { errors: [] });
        Object.assign(sc, { status: "queued", renderer: ev.renderer, errors: [], attempt: 0, redo: false, compare: false, cached: false });
        if (s.plan) { const p = s.plan.find((x) => x.index === ev.index); if (p) p.renderer = ev.renderer; }
        const how = [ev.library_scene ? `reusing library scene ${ev.library_scene}` : `with ${RENDERER[ev.renderer]}`,
          ev.edited ? "your edited prompt" : "", ev.note ? `note “${ev.note}”` : ""].filter(Boolean).join(", ");
        this.log(ev, `Redoing ${this.sceneLabel(ev.index)} ${how}. Only this scene is rebuilt.`);
        break;
      }
      case "done": {
        for (const [k] of STAGES) s.stages[k] = "done";
        const rebaked = s.rebaking || s.dirty.size > 0;
        s.done = ev; s.t1 = ev.t; s.rebaking = false; s.redoing = null; s.dirty.clear();
        this.log(ev, rebaked ? `✓ Reel rebaked with your redone scenes: ${ev.duration}s` : `✓ Reel ready: ${ev.duration}s`, "ok");
        break;
      }
      case "failed":
        s.failed = ev; s.t1 = ev.t; s.rebaking = false; s.redoing = null;
        for (const [k] of STAGES) if (s.stages[k] === "active") s.stages[k] = "failed";
        this.log(ev, `✕ Stopped${ev.stage ? ` during ${ev.stage}` : ""}: ${ev.error}`, "err");
        break;
    }
    this.render();
    if (["scene", "done", "failed", "plan", "scene_redone"].includes(ev.type) && ev.status !== "checking") signal("pulse");
  }

  renderClock() {
    const s = this.s;
    if (!s.t0) return;
    const end = s.t1 ?? Date.now() / 1000;
    $(".elapsed", this.el).textContent = s.t1 ? `${s.failed ? "stopped" : "done"} in ${fmt(end - s.t0)}` : fmt(end - s.t0);
  }

  render() {
    const s = this.s;
    const el = this.el;
    const live = $(".live", el);
    live.className = `live${s.running ? "" : s.failed ? " bad" : " off"}`;
    live.textContent = s.running ? "Live" : s.failed ? "Stopped" : "Finished";
    $(".job-head strong", el).textContent = s.failed ? "This run hit a problem" : s.rebaking ? "Rebaking your reel"
      : s.redoing != null ? `Redoing scene ${s.redoing + 1}` : s.done ? (s.dirty.size ? "Scenes changed: rebake to update the reel" : "Your reel is ready") : "Making your reel";
    for (const [k] of STAGES) $(`.pipe[data-stage="${k}"]`, el).className = `pipe ${s.stages[k] || ""}`;
    this.renderClock();

    // script
    const ss = $(".slot-script", el);
    if (s.script && !ss.dataset.done) {
      ss.dataset.done = 1;
      const segs = s.script.segments || [];
      ss.innerHTML = `
        <div class="script-card">
          <div class="title">${esc(s.script.title)}</div>
          <div class="hook">“${esc(segs[0]?.narration)}”</div>
          <details><summary>Read the full script</summary>
            <ol>${segs.map((g) => `<li><b>${esc(g.role)}:</b> ${esc(g.narration)}</li>`).join("")}</ol>
          </details>
        </div>`;
    }
    const sv = $(".slot-voice", el);
    if (s.voice && s.voice.provider !== "gemini" && !sv.dataset.done) {
      sv.dataset.done = 1;
      sv.innerHTML = `<div class="notice">${esc(s.voice.note || "Used the fallback voice.")}</div>`;
    }

    // scenes
    const box = $(".scenes", el);
    const idx = Object.keys(s.scenes).map(Number).sort((a, b) => a - b);
    for (const i of idx) this.renderScene(box, i);

    // rebake banner: redone scenes are not in the reel until it is reassembled
    const rb = $(".slot-rebake", el);
    const dirty = [...s.dirty].sort((a, b) => a - b);
    const rkey = `${dirty.join(",")}|${s.running}|${s.rebaking}`;
    if (rb.dataset.key !== rkey) {
      rb.dataset.key = rkey;
      if (s.rebaking && s.running) rb.innerHTML = `<div class="rebake"><span><b>Rebaking…</b> stitching the current clips with the narration and captions.</span><div class="spinner" aria-hidden="true" style="width:20px;height:20px"></div></div>`;
      else if (dirty.length && !s.running) {
        rb.innerHTML = `<div class="rebake"><span><b>${dirty.length} scene${dirty.length > 1 ? "s" : ""} changed</b> since the reel was baked (${dirty.map((i) => `Scene ${i + 1}`).join(", ")}). The video below is the old version until you rebake.</span><button class="cta small" type="button" data-rebake>Rebake reel</button></div>`;
        $("[data-rebake]", rb).onclick = (e) => this.rebake(e.target);
      } else rb.innerHTML = "";
    }

    // final / failure
    const fin = $(".slot-final", el);
    const key = s.done ? `done-${s.done.seq}-${dirty.length}` : s.failed ? `fail-${s.failed.seq}` : "";
    if (fin.dataset.key !== key) {
      fin.dataset.key = key;
      if (s.done) {
        const engines = [...new Set(Object.values(s.scenes).map((x) => RENDERER[x.renderer]))].join(", ");
        const cards = Object.values(s.scenes).filter((x) => x.status === "fallback").length;
        fin.innerHTML = `
          <div class="final${dirty.length ? " outdated" : ""}">
            <video src="${esc(this.finalURL(s.done.seq))}" controls playsinline preload="metadata"></video>
            <div class="side">
              ${dirty.length ? `<span class="outdated-tag">Outdated: doesn't include your redone scenes yet</span>` : ""}
              <h3>${esc(s.script?.title || "Your reel")}</h3>
              <p>${s.done.duration ? `${s.done.duration}s · ` : ""}animated with ${esc(engines || "code")}${cards ? ` · ${cards} scene${cards > 1 ? "s" : ""} used a title card — redo ${cards > 1 ? "them" : "it"} above` : ""}.</p>
              ${this.demo ? `<p style="color:var(--accent3)">Demo preview — clips from the library, no pipeline run.</p>` : ""}
              <div class="row">
                <a class="cta small" href="${esc(this.finalDownloadURL())}" download="reel-${this.id}.mp4">Download MP4</a>
                <button class="btn" type="button" data-share>Copy link</button>
              </div>
              <p>Not quite right? <b>Redo</b> any scene above: edit its prompt, add a note, switch engine or reuse a library scene. You'll see before and after, then <b>Rebake</b> to update the reel.</p>
            </div>
          </div>`;
        $("[data-share]", fin).onclick = async (e) => {
          try { await navigator.clipboard.writeText(`${location.origin}/#/job/${this.id}`); e.target.textContent = "Copied!"; } catch { e.target.textContent = `${location.origin}/#/job/${this.id}`; }
        };
      } else if (s.failed) {
        const hasScenes = idx.length > 0 && s.stages.render;
        const stage = STAGE_LABEL[s.failed.stage] || s.failed.stage;
        const canResume = s.failed.resumable && !this.demo;
        fin.innerHTML = `
          <div class="failbox">
            <strong>Something went wrong${stage ? ` during “${esc(stage)}”` : ""}</strong>
            <p>${esc(s.failed.error)}</p>
            ${s.autoRetry ? `<p style="color:var(--muted);font-size:13px">It was already retried once automatically, and that didn't work either.</p>` : ""}
            ${s.failed.detail ? `<details><summary>Technical details</summary><pre>${esc(s.failed.detail)}</pre></details>` : ""}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
              ${canResume ? `<button class="cta small" type="button" data-resume>Resume from “${esc(stage || "where it stopped")}”</button>` : ""}
              <button class="${canResume ? "btn sm" : "cta small"}" type="button" data-again>Start over</button>
              ${hasScenes ? `<span style="color:var(--muted);font-size:13px;align-self:center">or redo a single scene above</span>` : ""}
            </div>
            ${canResume ? `<p style="color:var(--muted);font-size:12.5px;margin:8px 0 0">Resume keeps the finished script, voiceover, plan and scenes, and runs only what's left.</p>` : ""}
          </div>`;
        $("[data-resume]", fin)?.addEventListener("click", async (e) => {
          e.target.disabled = true; e.target.textContent = "Resuming…";
          try { await postJSON(`/jobs/${this.id}/resume`); this.s.failed = null; this.s.autoRetry = null; this.connect(); }
          catch (err) { e.target.disabled = false; e.target.textContent = `Couldn't resume: ${err.message}`; }
        });
        $("[data-again]", fin).onclick = () => {
        if (this.demo) { input.value = this.topic; autosize(); updateSend(); input.focus(); form.scrollIntoView({ behavior: "smooth", block: "end" }); }
        else submit(this.topic);
      };
      } else fin.innerHTML = "";
    }
    updateFlow();
    if (!this.demo || this.s.running) follow();
  }

  flow() {
    const s = this.s;
    if (s.failed) return { step: s.done ? 4 : 3, warn: true, hint: `Something went wrong${s.failed.stage ? ` during <b>${esc(STAGE_LABEL[s.failed.stage] || s.failed.stage)}</b>` : ""}. ${s.failed.resumable ? "Press <b>Resume</b> to continue from there. Finished work is kept." : "Press <b>Start over</b> to try again."}` };
    if (s.rebaking) return { step: 5, hint: "<b>Rebaking</b> the reel with your redone scenes…" };
    if (s.redoing != null) return { step: 4, hint: `<b>Redoing scene ${s.redoing + 1}.</b> Only that scene is rebuilt; you'll compare before and after.` };
    if (s.done && s.dirty.size) return { step: 5, hint: "<b>Rebake</b> to put your redone scenes into the reel, then download." };
    if (s.done) return { step: 4, hint: "<b>Your reel is ready.</b> Review each scene and redo any you don't like, or download it now." };
    return { step: 3, hint: "<b>Animating.</b> Voice, then the scene plan, then each scene renders below. Usually about 3 minutes." };
  }

  async rebake(btn) {
    track("rebake_click", { job: this.id, dirty: [...(this.s.dirty || [])].length });
    if (btn) { btn.disabled = true; btn.textContent = "Starting…"; }
    if (this.demo) {
      this.connect();
      feedDemo(this, [[100, (q, t) => ({ type: "rebake", t, seq: this.s.lastSeq + 1, scenes: Object.keys(this.s.scenes).length })],
                      [1400, (q, t) => ({ type: "done", t, seq: this.s.lastSeq + 2, duration: this.s.done?.duration || 12 })]]);
      return;
    }
    try { await postJSON(`/jobs/${this.id}/rebake`); this.connect(); }
    catch (e) { if (btn) { btn.disabled = false; btn.textContent = `Couldn't rebake: ${e.message}`; } }
  }

  // The explicit record of a redo: what was asked, what changed, how it went, and before/after clips.
  changesHTML(i, sc, hist) {
    if (!hist.length) return "";
    const last = hist[hist.length - 1];
    const when = new Date(last.at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const R = (k) => esc(RENDERER[k] || k);
    const lines = [];
    if (last.reverted_to) lines.push(`Reverted to <b>version ${last.reverted_to}</b>: previous engine and prompt restored`);
    else {
      lines.push(last.renderer_before !== last.renderer_after ? `<span class="k">Engine:</span> ${R(last.renderer_before)} → <b>${R(last.renderer_after)}</b>` : `<span class="k">Engine:</span> kept ${R(last.renderer_after)}`);
      if (last.library_scene) lines.push(`<span class="k">Source:</span> reused library scene <b>${esc(last.library_scene)}</b> (no new code)`);
      if (last.description_edited) lines.push(`<span class="k">Prompt:</span> you edited it (diff below)`);
      if (last.note) lines.push(`<span class="k">Your note:</span> “${esc(last.note)}”, added to the prompt`);
      if (!last.description_edited && !last.note && !last.library_scene && last.renderer_before === last.renderer_after) lines.push(`<span class="k">Prompt:</span> unchanged; fresh attempt from the same direction`);
      lines.push(`<span class="k">Result:</span> ${last.fallback ? `<span class="err">all attempts failed; title card used</span>` : last.attempts ? `rendered in ${last.attempts} attempt${last.attempts > 1 ? "s" : ""}` : "ready"}${last.previous_fallback && !last.fallback ? " (replaces a title card)" : ""}`);
      for (const er of last.errors || []) lines.push(`<span class="k">Hit and fixed along the way:</span> <code style="font-size:11px">${esc(er)}</code>`);
    }
    lines.push(`<span class="k">Reel:</span> ${this.s.dirty.has(i) ? "not updated yet; press <b>Rebake</b>" : "includes this version"}`);
    const diff = last.description_before !== last.description_after
      ? `<details${last.description_edited ? " open" : ""}><summary style="cursor:pointer;color:var(--muted);font-size:12px;margin-top:6px">Prompt diff (red removed, green added)</summary><div class="diff">${wordDiff(last.description_before, last.description_after)}</div></details>` : "";
    const compare = "";
    const older = hist.length > 1 ? `<details class="older"><summary>${hist.length - 1} earlier change${hist.length > 2 ? "s" : ""}</summary><ul>${hist.slice(0, -1).reverse().map((h) =>
      `<li>v${h.version}: ${h.reverted_to ? `reverted to v${h.reverted_to}` : [h.renderer_before !== h.renderer_after ? `${R(h.renderer_before)} → ${R(h.renderer_after)}` : "", h.description_edited ? "prompt edited" : "", h.note ? `“${esc(h.note)}”` : "", h.library_scene ? "library scene" : ""].filter(Boolean).join(", ") || "fresh attempt"}</li>`).join("")}</ul></details>` : "";
    return `
      <div class="changes">
        <div class="changes-head"><span>What changed in version ${last.version}</span><small>${esc(when)}</small></div>
        <ul>${lines.map((x) => `<li>${x}</li>`).join("")}</ul>
        ${diff}${compare}
        <div class="row">
          <button class="cta small" type="button" data-compare>▶ Compare before / after</button>
          ${this.s.running ? "" : `<button class="btn sm" type="button" data-revert>↩ Revert to v${last.previous_version}</button>`}
        </div>
        ${older}
      </div>`;
  }

  // Before/after in a viewport-sized dialog: both clips always fit on screen, side by side.
  openCompare(i) {
    const hist = this.s.history[i] || [];
    const last = hist[hist.length - 1];
    if (!last) return;
    const sc = this.s.scenes[i];
    const dlg = $("#compareDlg");
    $("#compareTitle").textContent = `${this.sceneLabel(i)} · version ${last.previous_version} → ${last.version}`;
    $("#compareBefore").src = this.versionClipURL(i, last.previous_version);
    $("#compareAfter").src = this.sceneClipURL(i, sc.v);
    $("#compareBeforeCap").textContent = `Before · v${last.previous_version} · ${RENDERER[last.renderer_before] || last.renderer_before}`;
    $("#compareAfterCap").textContent = `After · v${last.version} · ${RENDERER[last.renderer_after] || last.renderer_after}`;
    const revert = $("#compareRevert");
    revert.hidden = this.s.running;
    revert.textContent = `↩ Revert to v${last.previous_version}`;
    revert.onclick = () => { dlg.close(); $(`.scene[data-i="${i}"] [data-revert]`, this.el)?.click(); };
    const sync = $("#compareSync");
    sync.onclick = () => { for (const v of [$("#compareBefore"), $("#compareAfter")]) { v.currentTime = 0; v.play().catch(() => {}); } };
    dlg.showModal();
    sync.onclick();
  }

  // Demo views have no server: simulate a redo so the UI can be previewed without a pipeline run.
  demoRedone(i, body) {
    const sc = this.s.scenes[i], p = this.s.plan?.find((x) => x.index === i) || {};
    const hist = this.s.history[i] || [];
    const prev = hist.length ? hist[hist.length - 1].version : 1;
    const before = { renderer: sc.renderer, description: p.description || "" };
    const after = body.revert && hist.length
      ? { renderer: hist[hist.length - 1].renderer_before, description: hist[hist.length - 1].description_before }
      : { renderer: body.renderer || sc.renderer, description: (body.description || before.description) + (body.note ? `\n\nViewer feedback for this new version (follow it): ${body.note}` : "") };
    const t = Date.now() / 1000;
    if (!body.revert) this.apply({ type: "retry", t, index: i, note: body.note || "", renderer: after.renderer, edited: !!body.description, library_scene: body.library_scene || null });
    this.connect();
    feedDemo(this, [[body.revert ? 200 : 1600, (q, tt) => ({
      type: "scene_redone", t: tt, seq: 1000 + Math.floor(tt * 10) % 100000, index: i, version: prev + 1, previous_version: prev, at: tt,
      reverted_to: body.revert ? hist[hist.length - 1].previous_version : undefined, note: body.note || "",
      renderer_before: before.renderer, renderer_after: after.renderer, description_before: before.description, description_after: after.description,
      description_edited: !!body.description, library_scene: body.library_scene || null, attempts: body.revert ? 0 : 2, fallback: false,
      previous_fallback: sc.status === "fallback", errors: body.revert ? [] : ["TypeError: Cannot read properties of undefined (reading 'x')"],
    })]]);
  }

  renderScene(box, i) {
    const s = this.s;
    const sc = s.scenes[i];
    const p = s.plan?.find((x) => x.index === i);
    let card = $(`.scene[data-i="${i}"]`, box);
    if (!card) {
      card = document.createElement("article");
      card.className = "scene";
      card.dataset.i = i;
      box.append(card);
    }
    const canRedo = !s.running && ["done", "fallback", "error", "failed", "queued"].includes(sc.status);
    const canInteract = sc.renderer === "three" && sc.player && ["done", "fallback"].includes(sc.status);
    const hist = s.history[i] || [];
    const sig = JSON.stringify([sc.status, sc.attempt, sc.errors.length, sc.renderer, sc.v, canRedo, sc.redo, sc.show3d, sc.player,
                                hist.length, sc.compare, s.dirty.has(i), sc.cached, !!sc.lib]);
    if (card.dataset.sig === sig) return;
    card.dataset.sig = sig;

    const working = ["coding", "fixing", "checking", "rendering", "fallback_rendering"].includes(sc.status);
    const failing = sc.errors.length > 0 && working;
    card.className = `scene ${sc.status === "done" ? "done" : sc.status === "fallback" ? "fallback" : failing || sc.status === "failed" ? "failing" : ""}`;

    const STATUS = {
      queued: ["Waiting to start", ""],
      coding: [`Writing ${RENDERER[sc.renderer]} code · attempt ${sc.attempt}/${sc.max}`, ""],
      fixing: [`Fixing the error · attempt ${sc.attempt}/${sc.max}`, "warn"],
      checking: [`Checking the code · attempt ${sc.attempt}/${sc.max}`, ""],
      rendering: [`Rendering · attempt ${sc.attempt}/${sc.max}`, ""],
      error: [`Attempt ${sc.attempt} failed — retrying`, "bad"],
      done: [sc.attempt > 1 ? `Rendered after ${sc.attempt} attempts` : "Rendered on the first try", "ok"],
      fallback_rendering: ["All attempts failed — making a title card", "warn"],
      fallback: [`Title card used after ${sc.max} failed attempts`, "warn"],
      failed: ["Could not be rendered", "bad"],
    };
    const [statusText, statusCls] = STATUS[sc.status] || [sc.status, ""];
    const preview = sc.v != null
      ? `<video src="${esc(this.sceneClipURL(i, sc.v))}" muted loop autoplay playsinline></video>
         ${sc.status === "fallback" ? `<span class="tag badge" style="color:var(--accent3)">title card</span>` : ""}`
      : working ? `<div class="spinner" aria-hidden="true"></div>` : `<div class="wait">${sc.status === "queued" ? "Queued" : ""}</div>`;

    const errors = sc.errors.map((e) => `
      <div class="attempt">
        <b>Attempt ${e.attempt} failed</b> while ${esc(e.stage || "running")}
        <code>${esc(e.error)}</code>
        ${e.detail ? `<details><summary>Full error</summary><pre>${esc(e.detail)}</pre></details>` : ""}
      </div>`).join("");

    const desc = p?.description || "";
    const libList = sc.lib ? (sc.lib.length ? `
          <label><input type="radio" name="lib" value="" checked><span></span><span>None: generate a new scene</span></label>
          ${sc.lib.map((m) => `<label><input type="radio" name="lib" value="${esc(m.id)}"><video src="/library/scenes/${encodeURIComponent(m.id)}/clip" muted loop autoplay playsinline></video><span><b>${esc(RENDERER[m.renderer])}</b> · ${esc(m.topic)}<br>${esc(m.description.slice(0, 110))}…</span></label>`).join("")}`
      : `<span style="font-size:12px;color:var(--muted)">No similar library scenes with a clip yet.</span>`) : "";
    const redo = canRedo ? (sc.redo ? `
      <form class="redo">
        <label class="fl" for="p${this.id}${i}">Animator prompt <small>: exactly what the code-writer is told to draw. Edit it directly.</small></label>
        <textarea class="prompt" id="p${this.id}${i}" name="description" rows="5">${esc(desc)}</textarea>
        <label class="fl" for="n${this.id}${i}">Quick note <small>: optional, added to the prompt as viewer feedback</small></label>
        <textarea rows="2" id="n${this.id}${i}" name="note" placeholder="e.g. move the lock below the text, spread the counters apart, fewer elements"></textarea>
        <div class="row">
          <select name="renderer" aria-label="Engine">
            <option value="">Keep ${esc(RENDERER[sc.renderer])}</option>
            ${Object.entries(RENDERER).filter(([k]) => k !== sc.renderer).map(([k, v]) => `<option value="${k}">Switch to ${v}</option>`).join("")}
          </select>
          <button class="btn sm" type="button" data-lib>${sc.lib ? "Hide library" : "Reuse a library scene…"}</button>
        </div>
        ${sc.lib ? `<div class="libpick">${libList}</div>` : ""}
        <div class="row">
          <button class="cta small" type="submit">Redo this scene</button>
          <button class="btn sm" type="button" data-cancel>Cancel</button>
        </div>
        <p style="font-size:12px;color:var(--muted);margin:6px 0 0">Only this scene is rebuilt. Your reel stays the same until you press <b>Rebake</b>.</p>
      </form>` : `<button class="btn sm" type="button" data-redo>↻ Redo scene</button>`)
      : (s.running && sc.errors.length ? `<span style="font-size:12px;color:var(--muted)">You can redo this scene once the run finishes.</span>` : "");
    const changes = this.changesHTML(i, sc, hist);

    card.innerHTML = `
      <div class="preview">${preview}</div>
      <div class="head"><strong>${esc(this.sceneLabel(i).replace(/^Scene \d+ · /, "") || `Scene ${i + 1}`)}</strong><span class="tag" data-r="${esc(sc.renderer)}">${esc(RENDERER[sc.renderer] || sc.renderer)}</span></div>
      <div class="body">
        <div class="status ${statusCls}">${esc(statusText)}</div>
        ${p?.duration ? `<div style="font-size:12px;color:var(--muted)">Scene ${i + 1} · ${p.duration.toFixed(1)}s</div>` : ""}
        ${canInteract ? `<div style="margin-top:8px"><button class="btn sm" type="button" data-3d>${sc.show3d ? "Hide 3D" : "Explore in 3D"}</button></div>
        <div class="td" ${sc.show3d ? "" : "hidden"}><iframe title="Interactive 3D scene ${i + 1}" src="/jobs/${this.id}/scenes/${i}/player" sandbox="allow-scripts" loading="lazy" allow="autoplay; fullscreen"></iframe></div>` : ""}
        ${sc.cached ? `<div class="tag reuse" style="margin-top:6px">♻ reused from cache</div>` : ""}
        ${errors ? `<div class="attempts">${errors}</div>` : ""}
        ${changes}
        ${redo}
      </div>`;

    $("[data-3d]", card)?.addEventListener("click", () => { sc.show3d = !sc.show3d; this.renderScene(box, i); });
    $("[data-redo]", card)?.addEventListener("click", () => { track("scene_redo_open", { job: this.id, scene: i }); sc.redo = true; this.renderScene(box, i); $("textarea", card)?.focus(); });
    $("[data-cancel]", card)?.addEventListener("click", () => { sc.redo = false; sc.lib = null; this.renderScene(box, i); });
    $("[data-lib]", card)?.addEventListener("click", async (e) => {
      if (sc.lib) { sc.lib = null; this.renderScene(box, i); return; }
      e.target.disabled = true; e.target.textContent = "Finding similar scenes…";
      const keep = { d: $("textarea[name=description]", card)?.value, n: $("textarea[name=note]", card)?.value, r: $("select[name=renderer]", card)?.value };
      try { sc.lib = this.demo ? [] : await getJSON(`/jobs/${this.id}/scenes/${i}/similar${keep.r ? `?renderer=${keep.r}` : ""}`); }
      catch { sc.lib = []; }
      this.renderScene(box, i);
      if (keep.d != null) $("textarea[name=description]", card).value = keep.d;
      if (keep.n != null) $("textarea[name=note]", card).value = keep.n;
      if (keep.r != null) $("select[name=renderer]", card).value = keep.r;
    });
    $("[data-compare]", card)?.addEventListener("click", () => this.openCompare(i));
    $("[data-revert]", card)?.addEventListener("click", async (e) => {
      e.target.disabled = true; e.target.textContent = "Reverting…";
      if (this.demo) { this.demoRedone(i, { revert: true }); return; }
      try { await postJSON(`/jobs/${this.id}/scenes/${i}/revert`); this.connect(); }
      catch (err) { e.target.disabled = false; e.target.textContent = `Couldn't revert: ${err.message}`; }
    });
    $("form.redo", card)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { note: fd.get("note")?.trim() || "" };
      if (fd.get("renderer")) body.renderer = fd.get("renderer");
      const edited = (fd.get("description") || "").trim();
      if (edited && edited !== desc.trim()) body.description = edited;
      if (fd.get("lib")) body.library_scene = fd.get("lib");
      track("scene_redo_submit", { job: this.id, scene: i, engine: body.renderer || sc.renderer || "auto", edited: !!body.description, note: !!body.note, library: !!body.library_scene });
      e.target.querySelector("button[type=submit]").disabled = true;
      if (this.demo) { sc.redo = false; sc.lib = null; this.demoRedone(i, body); return; }
      try {
        await postJSON(`/jobs/${this.id}/scenes/${i}/retry`, body);
        sc.redo = false; sc.lib = null;
        this.connect();
      } catch (err) {
        e.target.insertAdjacentHTML("beforeend", `<div class="status bad">${esc(err.message)}</div>`);
        e.target.querySelector("button[type=submit]").disabled = false;
      }
    });
  }
}

// =====================================================================
// UI demo — canned JobViews for previewing chat states without a pipeline run.
// =====================================================================
const demoBtn = $("#demoBtn");
const demoMenu = $("#demoMenu");
demoBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (demoMenu.hidden) placeMenu(demoMenu, demoBtn, "down");
  else demoMenu.hidden = true;
  demoBtn.setAttribute("aria-expanded", String(!demoMenu.hidden));
});
document.addEventListener("click", (e) => { if (demoMenu && !e.target.closest("#demoMenu") && !e.target.closest("#demoBtn")) demoMenu.hidden = true; });
demoMenu?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-demo]");
  if (!b) return;
  demoMenu.hidden = true;
  demoBtn.setAttribute("aria-expanded", "false");
  runDemo(b.dataset.demo);
});

async function demoClips(n) {
  const all = await getJSON("/library/scenes");
  const clips = all.filter((s) => s.has_clip);
  if (!clips.length) throw new Error("No rendered clips in the library yet — run a reel first.");
  return Array.from({ length: n }, (_, i) => clips[i % clips.length]);
}

function mountDemoView(topic, urls) {
  $("#studioEmpty")?.remove();
  const el = document.createElement("div");
  el.className = "msg bot";
  thread.append(el);
  const id = `demo-${Date.now().toString(36)}`;
  const view = new JobView(el, id, `${topic} (demo)`, { demo: true, urls });
  views.set(id, view);
  el.scrollIntoView({ block: "start" });
  return view;
}

function feedDemo(view, steps) {
  let seq = 0;
  const clearEnd = () => {
    view.s.running = false;
    activeJobs.delete(view.id);
    signal(view.s.failed ? "error" : "done");
    view.render();
  };
  steps.forEach(([ms, build], k) => {
    view.demoTimers.push(setTimeout(() => {
      const ev = build(seq++, Date.now() / 1000);
      if (ev === null) { clearEnd(); return; }
      view.apply(ev);
      if (k === steps.length - 1 && ev.type !== "failed") clearEnd();
      if (ev.type === "failed") clearEnd();
    }, ms));
  });
}

const demoScript = {
  title: "Three knocks: the TCP handshake",
  segments: [
    { role: "hook", narration: "The internet starts every chat with three knocks.", visual_directive: "Two laptops on a dark grid; a door between them gets three glowing knocks." },
    { role: "setup", narration: "Two machines must agree on the rules before a single byte flows.", visual_directive: "A rulebook card slides between the machines; data packets wait behind a gate." },
    { role: "mechanism", narration: "SYN, SYN-ACK, ACK — each knock answered in turn.", visual_directive: "Three labelled packets travel left, right, left on a timeline, each lighting up on its word." },
    { role: "payoff", narration: "Three packets, and strangers become a connection.", visual_directive: "The gate opens and a steady stream of packets flows; the link glows green." },
  ],
};

async function demoHappyJob() {
  const topic = "How does the TCP handshake work?";
  const picks = await demoClips(4);
  const urls = { scene: (i) => `/library/scenes/${picks[i].id}/clip`, final: `/library/scenes/${picks[0].id}/clip` };
  const view = mountDemoView(topic, urls);
  const plan = picks.map((p, i) => ({ index: i, role: p.role || ["hook", "setup", "mechanism", "payoff"][i], renderer: p.renderer, duration: 3.0, description: (p.description || "").slice(0, 140) }));
  const steps = [
    [100, (q, t) => ({ type: "queued", t, seq: q, topic })],
    [500, (q, t) => ({ type: "stage", t, seq: q, stage: "script", label: "Writing the script" })],
    [1200, (q, t) => ({ type: "script", t, seq: q, script: demoScript })],
    [1600, (q, t) => ({ type: "stage", t, seq: q, stage: "voice", label: "Recording the voiceover" })],
    [2400, (q, t) => ({ type: "voice", t, seq: q, duration: 41.0, provider: "gemini" })],
    [2800, (q, t) => ({ type: "stage", t, seq: q, stage: "plan", label: "Directing the scenes" })],
    [3400, (q, t) => ({ type: "plan", t, seq: q, scenes: plan })],
    [3800, (q, t) => ({ type: "stage", t, seq: q, stage: "render", label: "Animating scenes" })],
  ];
  plan.forEach((p, i) => {
    const b = 4200 + i * 1600;
    steps.push([b, (q, t) => ({ type: "scene", t, seq: q, index: i, renderer: p.renderer, status: "coding", attempt: 1, max_attempts: 3 })]);
    steps.push([b + 500, (q, t) => ({ type: "scene", t, seq: q, index: i, renderer: p.renderer, status: "rendering", attempt: 1, max_attempts: 3 })]);
    steps.push([b + 1100, (q, t) => ({ type: "scene", t, seq: q, index: i, renderer: p.renderer, status: "done", attempt: 1, max_attempts: 3 })]);
  });
  steps.push([4200 + plan.length * 1600 + 400, (q, t) => ({ type: "done", t, seq: q, duration: 41.0 })]);
  feedDemo(view, steps);
  return view;
}

function mountDemoPitch(kind) {
  const topic = "How does the TCP handshake work?";
  $("#studioEmpty")?.remove();
  const el = document.createElement("div");
  el.className = "msg bot";
  thread.append(el);
  const pid = `demo-pitch-${Date.now().toString(36)}`;
  const view = new PitchView(el, pid, topic, undefined);
  if (kind === "pitch-failed") {
    view.pitch = { id: pid, topic, status: "failed", error: "Demo error — the model didn't respond. Try again." };
  } else if (kind === "pitch-ready") {
    view.pitch = { id: pid, topic, status: "ready", renderer: null, script: demoScript };
  } else {
    view.pitch = null; // writing spinner; approve hidden until content lands
  }
  views.set(`pitch:${pid}`, view);
  view.render();
  el.scrollIntoView({ block: "start" });
  return view;
}

async function runDemo(kind) {
  if ($("#studio").hidden) { location.hash = "#/create"; await new Promise((r) => setTimeout(r, 400)); }
  const topic = "How does the TCP handshake work?";
  try {
    if (kind === "happy") { await demoHappyJob(); }
    else if (kind === "pitch-writing" || kind === "pitch-ready" || kind === "pitch-failed") { mountDemoPitch(kind); }
    else if (kind === "journey") {
      const pv = mountDemoPitch("pitch-ready");
      setTimeout(() => pv.approve(), 2500);
    } else if (kind === "live") {
      const picks = await demoClips(2);
      const urls = { scene: (i) => `/library/scenes/${picks[i].id}/clip`, final: `/library/scenes/${picks[0].id}/clip` };
      const view = mountDemoView(topic, urls);
      const r0 = picks[0].renderer, r1 = picks[1].renderer;
      feedDemo(view, [
        [100, (q, t) => ({ type: "queued", t, seq: q, topic })],
        [500, (q, t) => ({ type: "script", t, seq: q, script: demoScript })],
        [900, (q, t) => ({ type: "voice", t, seq: q, duration: 12.4, provider: "gemini" })],
        [1300, (q, t) => ({ type: "plan", t, seq: q, scenes: [
          { index: 0, role: picks[0].role || "hook", renderer: r0, duration: 3.0, description: "" },
          { index: 1, role: picks[1].role || "setup", renderer: r1, duration: 3.0, description: "" }] })],
        [1700, (q, t) => ({ type: "scene", t, seq: q, index: 0, renderer: r0, status: "rendering", attempt: 1, max_attempts: 3 })],
        [2600, (q, t) => ({ type: "scene", t, seq: q, index: 0, renderer: r0, status: "done", attempt: 1, max_attempts: 3 })],
        [3000, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "coding", attempt: 1, max_attempts: 3 })],
        [3800, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "error", attempt: 1, max_attempts: 3, stage: "rendering", error: "TypeError: x is undefined", detail: "Demo error — watch it recover." })],
        [4600, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "fixing", attempt: 2, max_attempts: 3 })],
        [5600, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "rendering", attempt: 2, max_attempts: 3 })],
        [6800, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "done", attempt: 2, max_attempts: 3 })],
      ]);
    } else if (kind === "fallback") {
      const picks = await demoClips(2);
      const urls = { scene: (i) => `/library/scenes/${picks[i].id}/clip`, final: `/library/scenes/${picks[0].id}/clip` };
      const view = mountDemoView(topic, urls);
      const r0 = picks[0].renderer, r1 = picks[1].renderer;
      feedDemo(view, [
        [100, (q, t) => ({ type: "queued", t, seq: q, topic })],
        [500, (q, t) => ({ type: "script", t, seq: q, script: demoScript })],
        [900, (q, t) => ({ type: "voice", t, seq: q, duration: 12.4, provider: "gemini" })],
        [1300, (q, t) => ({ type: "plan", t, seq: q, scenes: [
          { index: 0, role: picks[0].role || "hook", renderer: r0, duration: 3.0, description: "" },
          { index: 1, role: picks[1].role || "setup", renderer: r1, duration: 3.0, description: "" }] })],
        [1700, (q, t) => ({ type: "scene", t, seq: q, index: 0, renderer: r0, status: "done", attempt: 1, max_attempts: 3 })],
        [2100, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "error", attempt: 1, max_attempts: 3, stage: "coding", error: "Banned: useFrame from @react-three/fiber", detail: "Demo error." })],
        [2800, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "error", attempt: 2, max_attempts: 3, stage: "rendering", error: "Render timed out", detail: "Demo error." })],
        [3500, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "fallback_rendering", attempt: 3, max_attempts: 3 })],
        [4300, (q, t) => ({ type: "scene", t, seq: q, index: 1, renderer: r1, status: "fallback", attempt: 3, max_attempts: 3 })],
        [4900, (q, t) => ({ type: "done", t, seq: q, duration: 12.4 })],
      ]);
    } else if (kind === "voice") {
      const view = mountDemoView(topic, { scene: () => "", final: "" });
      feedDemo(view, [
        [100, (q, t) => ({ type: "queued", t, seq: q, topic })],
        [500, (q, t) => ({ type: "script", t, seq: q, script: demoScript })],
        [1200, (q, t) => ({ type: "voice", t, seq: q, duration: 9.8, provider: "macos", note: "All Gemini keys are out of quota; used the Samantha voice instead." })],
        [1800, (q, t) => ({ type: "plan", t, seq: q, scenes: [{ index: 0, role: "hook", renderer: "remotion", duration: 3.0, description: "" }] })],
      ]);
    } else if (kind === "failed") {
      const view = mountDemoView(topic, { scene: () => "", final: "" });
      feedDemo(view, [
        [100, (q, t) => ({ type: "queued", t, seq: q, topic })],
        [600, (q, t) => ({ type: "stage", t, seq: q, stage: "voice", label: "Recording the voiceover" })],
        [1600, (q, t) => ({ type: "failed", t, seq: q, stage: "voice", error: "429 RESOURCE_EXHAUSTED — Gemini daily quota used up", detail: "Demo error. Keys rotate automatically; try again after reset." })],
      ]);
    }
  } catch (e) {
    addUser(topic);
    const el = document.createElement("div");
    el.className = "msg bot";
    el.innerHTML = `<div class="bubble"><div class="failbox"><strong>Demo unavailable</strong><p>${esc(e.message)}</p></div></div>`;
    thread.append(el);
    scrollDown();
  }
}

// --------------------------------------------------------------------
// Pitch review: storyboard first, pipeline only on approval.
// --------------------------------------------------------------------
class PitchView {
  constructor(el, pid, topic, renderer) {
    this.el = el;
    this.pid = pid;
    this.topic = topic;
    this.renderer = renderer;
    this.pitch = null;
    this.misses = 0;
    this.expired = false;
    // Demo pitches exist only in the browser: never poll the server for them.
    if (!String(pid).startsWith("demo-")) {
      this.timer = setInterval(() => this.refresh(), 2000);
      this.refresh();
    }
  }
  close() { clearInterval(this.timer); }
  async refresh() {
    try {
      const p = await getJSON(`/pitches/${this.pid}`);
      this.misses = 0;
      const wasReady = this.pitch?.status === "ready";
      this.pitch = p;
      // Once the storyboard is on screen, never re-render it (that would wipe the user's edits): update the status line only.
      if (wasReady && p.status === "ready") this.renderPrefetch();
      else this.render();
      if (p.status === "failed" || (p.status === "ready" && p.prefetch !== "running")) clearInterval(this.timer);
    } catch (e) {
      // pitch.json is written before POST returns, so a 404 means it's really gone (e.g. outputs/ was cleared).
      if (e.status === 404 || ++this.misses > 15) { clearInterval(this.timer); this.expired = true; }
      this.render();
    }
  }
  segEdits() {
    return [...this.el.querySelectorAll("textarea[data-seg]")].map((t) => t.value);
  }
  prefetchNote() {
    const p = this.pitch || {};
    if (p.prefetch === "running") return `<span class="pf run"><i class="dot"></i>Recording the voice and planning the scenes in the background while you review, so animation can start sooner.</span>`;
    if (p.prefetch === "ready") return `<span class="pf ok">✓ Voice and scene plan ready${p.prefetch_s ? ` (${Math.round(p.prefetch_s)}s, done while you read)` : ""}. Approve without changing the narration, visuals or note and both are reused.</span>`;
    if (p.prefetch === "failed") return `<span class="pf">Background prep didn't finish; approving will record the voice as usual.</span>`;
    return "";
  }
  renderPrefetch() {
    const el = this.el.querySelector(".prefetch-note");
    if (el) el.innerHTML = this.prefetchNote();
  }
  visEdits() {
    return [...this.el.querySelectorAll("textarea[data-vis]")].map((t) => t.value);
  }
  flow() {
    const p = this.pitch;
    if (this.expired) return { step: 1, warn: true, hint: "That storyboard is no longer on the server. <b>Start again</b> or type a new question." };
    if (!p || p.status === "writing") return { step: 2, hint: "<b>Writing your storyboard…</b> one quick script pass. Nothing is recorded or animated yet." };
    if (p.status === "failed") return { step: 1, warn: true, hint: "The storyboard couldn't be written. Press <b>Try again</b> or change the question." };
    return { step: 2, hint: "<b>Review the storyboard.</b> 🎙 <b>Narration</b> is read aloud word for word. 🎬 <b>Visual</b> is what gets drawn. The <b>director's note</b> steers every scene's animation. Edit anything, then <b>Approve &amp; animate</b>." };
  }
  async approve() {
    const p = this.pitch;
    // Demo pitches animate a canned run instead of hitting the pipeline.
    if (String(this.pid).startsWith("demo-")) {
      const btn = this.el.querySelector("[data-approve]");
      if (btn) { btn.disabled = true; btn.textContent = "Starting…"; }
      this.el.querySelector(".pitch").insertAdjacentHTML("beforeend",
        `<p class="approved-note">Approved — animating below (demo run).</p>`);
      this.el.querySelectorAll("button, textarea").forEach((n) => { n.disabled = true; });
      views.delete(`pitch:${this.pid}`);
      await demoHappyJob();
      return;
    }
    const btn = this.el.querySelector("[data-approve]");
    if (btn) { btn.disabled = true; btn.textContent = "Starting…"; }
    track("pitch_approve", { pitch: this.pid, engine: this.renderer || "auto" });
    try {
      const said = this.segEdits(), seen = this.visEdits();
      const segments = p.script.segments.map((s, i) => ({ ...s, narration: (said[i] ?? s.narration).trim() || s.narration,
                                                           visual_directive: (seen[i] ?? s.visual_directive).trim() || s.visual_directive }));
      const noteEl = this.el.querySelector("textarea[data-note]");
      const job = await getJSON(`/pitches/${this.pid}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: { ...p.script, segments },
          ...(this.renderer ? { renderer: this.renderer } : {}), thread_id: getThreadId(),
          note: noteEl ? noteEl.value : "" }),
      });
      const item = chat.find((c) => c.pitchId === this.pid);
      if (item) { delete item.pitchId; item.jobId = job.id; saveChat(); }
      views.delete(`pitch:${this.pid}`);
      this.el.querySelector(".pitch").insertAdjacentHTML("beforeend",
        `<p class="approved-note">Approved — animating below.</p>`);
      this.el.querySelectorAll("button, textarea").forEach((n) => { n.disabled = true; });
      mountJob(job.id, this.topic, this.renderer);
      history.replaceState(null, "", `#/job/${job.id}`);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Approve & animate"; }
      this.el.querySelector(".pitch").insertAdjacentHTML("beforeend",
        `<p style="color:var(--accent2);font-size:13px">Couldn't start: ${esc(e.message)}</p>`);
    }
  }
  render() {
    this.renderBody();
    updateFlow();
  }
  renderBody() {
    const p = this.pitch;
    if (this.expired) {
      this.el.innerHTML = `<div class="bubble pitch"><div class="failbox"><strong>This storyboard is no longer available</strong><p>It was removed from the server. You can write a fresh one for the same question.</p><button class="cta small" type="button" data-retry>Write it again</button></div></div>`;
      this.el.querySelector("[data-retry]").onclick = () => submit(this.topic);
      return;
    }
    if (!p || p.status === "writing") {
      this.el.innerHTML = `<div class="bubble pitch"><div class="spinner" aria-hidden="true"></div><p style="color:var(--muted)">Writing the storyboard… Nothing is recorded or animated yet.</p></div>`;
      scrollDown();
      return;
    }
    if (p.status === "failed") {
      this.el.innerHTML = `<div class="bubble pitch"><div class="failbox"><strong>The storyboard couldn't be written</strong><p>${esc(p.error || "the model didn't respond")}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cta small" type="button" data-retry>Try again</button><button class="btn sm" type="button" data-edit>Edit the question</button></div></div></div>`;
      this.el.querySelector("[data-retry]").onclick = () => submit(this.topic);
      this.el.querySelector("[data-edit]").onclick = () => { input.value = this.topic; autosize(); updateSend(); input.focus(); };
      return;
    }
    const s = p.script;
    const cards = s.segments.map((seg, i) => `
      <div class="sb">
        <div class="sb-head"><span class="sb-num">${i + 1}</span><span class="sb-role">${esc(seg.role)}</span>${this.renderer ? `<span class="tag" data-r="${esc(this.renderer)}">${esc(RENDERER[this.renderer] || this.renderer)}</span>` : `<span class="tag">auto engine</span>`}</div>
        <label class="sb-label" for="seg${this.pid}${i}">🎙 Narration <small>: spoken word for word in the voiceover</small></label>
        <textarea id="seg${this.pid}${i}" data-seg="${i}" rows="2">${esc(seg.narration)}</textarea>
        <label class="sb-label" for="vis${this.pid}${i}">🎬 Visual <small>: what the animator draws on screen (not spoken)</small></label>
        <textarea class="vis" id="vis${this.pid}${i}" data-vis="${i}" rows="2">${esc(seg.visual_directive || "")}</textarea>
      </div>`).join("");
    this.el.innerHTML = `<div class="bubble pitch">
      <div class="kicker">Storyboard — review before anything renders</div>
      <h3 style="margin:6px 0 2px">${esc(s.title)}</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 4px">${esc(s.idea || "")}</p>
      <div class="expl">
        <span><b>🎙 Narration</b>: the exact words the voice reads. Change these to change what's said.</span>
        <span><b>🎬 Visual</b>: the brief for that scene's animation. Never spoken.</span>
        <span><b>🎬 Director's note</b>: one instruction applied to every scene's animation (style, layout). Never spoken.</span>
      </div>
      <div class="sb note-box">
        <div class="sb-head"><span class="sb-role">🎬 Director's note</span><small style="color:var(--muted);font-size:12px">applies to the animation of every scene, not spoken</small></div>
        <textarea data-note rows="2" placeholder="e.g. use a timeline view in the mechanism, keep the palette to blue and orange">${esc(p.note || "")}</textarea>
      </div>
      ${cards}
      <div class="row">
        <button class="cta small" type="button" data-approve>Approve &amp; animate</button>
        <button class="btn sm" type="button" data-repitch>New pitch</button>
      </div>
      <p class="prefetch-note">${this.prefetchNote()}</p>
      <p style="color:var(--muted);font-size:12px;margin:8px 0 0">Approving records the voiceover from the narration above and animates each visual. You can still redo single scenes afterwards.</p>
    </div>`;
    this.el.querySelector("[data-approve]").onclick = () => this.approve();
    this.el.querySelector("[data-repitch]").onclick = () => submit(this.topic);
    scrollDown();
  }
}

function mountPitch(pid, topic, renderer) {
  const key = `pitch:${pid}`;
  if (views.has(key)) return;
  addUser(topic, renderer);
  const el = document.createElement("div");
  el.className = "msg bot";
  thread.append(el);
  views.set(key, new PitchView(el, pid, topic, renderer));
  scrollDown();
}

// --------------------------------------------------------------------
// Director panel: brief inputs shared by composer + pitch.
// --------------------------------------------------------------------
const directDrawer = $("#directDrawer");
$("#directBtn")?.addEventListener("click", () => { directDrawer.hidden = false; });
$("#directClose")?.addEventListener("click", () => { directDrawer.hidden = true; });
document.addEventListener("click", (e) => {
  if (!directDrawer.hidden && !e.target.closest("#directDrawer") && !e.target.closest("#directBtn")) directDrawer.hidden = true;
});
document.querySelectorAll('input[name="dengine"]').forEach((r) => r.addEventListener("change", () => {
  const names = { "": "Auto", manim: "Manim", remotion: "2D motion", three: "3D" };
  const logos = { "": "auto", manim: "manim", remotion: "motion", three: "three" };
  setEngine(r.value, names[r.value], logos[r.value]);
  const menuSvg = document.querySelector(`.eng-menu > button[data-v="${CSS.escape(r.value)}"] .eng-logo svg`);
  if (menuSvg) document.querySelector("#engineBtn .eng-logo").innerHTML = menuSvg.outerHTML;
}));
document.querySelectorAll('input[name="dlength"]').forEach((r) => r.addEventListener("change", syncDirectLabel));
syncDirectLabel();

// --------------------------------------------------------------------
// Chats drawer (server-side threads) + run-analytics dialog.
// --------------------------------------------------------------------
const chatsDrawer = $("#chatsDrawer");
async function openChats() {
  chatsDrawer.hidden = false;
  const list = $("#chatsList");
  list.innerHTML = `<p style="color:var(--muted)">Loading…</p>`;
  try {
    const threads = await getJSON("/chats");
    const cur = (() => { try { return localStorage.getItem("elucera.thread"); } catch { return null; } })();
    list.innerHTML = threads.length ? "" : `<p style="color:var(--muted)">No chats yet — your first reel starts one.</p>`;
    for (const t of threads) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:6px;align-items:stretch";
      const b = document.createElement("button");
      b.type = "button";
      b.style.flex = "1";
      b.className = "thread" + (t.id === cur ? " active" : "");
      const when = t.updated ? new Date(t.updated * 1000).toLocaleString() : "";
      const n = t.items ?? t.jobs;
      b.innerHTML = `<span>${esc(t.title)}</span><small>${n} item${n === 1 ? "" : "s"} · ${t.jobs} reel${t.jobs === 1 ? "" : "s"} · ${esc(when)}</small>`;
      b.addEventListener("click", () => loadThread(t.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn sm";
      del.title = del.ariaLabel = `Delete chat “${t.title}”`;
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        del.disabled = true;
        try {
          await getJSON(`/chats/${encodeURIComponent(t.id)}`, { method: "DELETE" });
          if (t.id === cur) $("#newChat").click();
          openChats();
        } catch (e) { del.disabled = false; del.textContent = "!"; del.title = e.message; }
      });
      row.append(b, del);
      list.append(row);
    }
  } catch (e) {
    list.innerHTML = `<p style="color:var(--accent2)">Couldn't load chats: ${esc(e.message)}</p>`;
  }
}
async function loadThread(tid) {
  chatsDrawer.hidden = true;
  const t = await getJSON(`/chats/${tid}`);
  for (const v of views.values()) v.close();
  views.clear();
  chat = [];
  try { localStorage.setItem("elucera.thread", tid); } catch { /* private mode */ }
  thread.innerHTML = "";
  chat = t.items.map(toChatItem);
  if (!chat.length) thread.innerHTML = `<section class="studio-empty" id="studioEmpty"><h2>This chat is empty</h2><p>Type a question below to start a storyboard.</p></section>`;
  for (const item of chat) mountItem(item);
  saveChat();
  const firstJob = chat.find((c) => c.jobId);
  history.replaceState(null, "", firstJob ? `#/job/${firstJob.jobId}` : "#/create");
  updateFlow();
  input.focus();
}
$("#chatsBtn")?.addEventListener("click", openChats);
$("#chatsClose")?.addEventListener("click", () => { chatsDrawer.hidden = true; });

const statsOverlay = $("#statsOverlay");
function fmtSecs(v) { return v == null ? "—" : v >= 60 ? `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` : `${v}s`; }
async function openStats() {
  statsOverlay.hidden = false;
  const body = $("#statsBody");
  body.innerHTML = `<p style="color:var(--muted)">Loading…</p>`;
  try {
    const s = await getJSON("/analytics/summary");
    const pct = s.success_rate == null ? "—" : `${Math.round(s.success_rate * 100)}%`;
    const rows = Object.entries(s.renderers || {}).map(([name, r]) =>
      `<tr><td>${esc(RENDERER[name] || name)}</td><td>${r.scenes}</td><td>${r.attempts}</td><td>${r.done}</td><td>${r.fallback}</td><td>${r.first_try_rate == null ? "—" : Math.round(r.first_try_rate * 100) + "%"}</td></tr>`).join("");
    const errs = (s.top_errors || []).map(([msg, n]) => `<div style="color:var(--accent2);font-size:12.5px">×${n} — ${esc(msg)}</div>`).join("") || `<p style="color:var(--muted)">No errors recorded.</p>`;
    const voices = Object.entries(s.voice_providers || {}).map(([p, n]) => `${esc(p)} ×${n}`).join(", ") || "—";
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><b>${s.jobs}</b><span>runs</span></div>
        <div class="stat"><b>${pct}</b><span>success</span></div>
        <div class="stat"><b>${fmtSecs(s.avg_total_s)}</b><span>avg run</span></div>
        <div class="stat"><b>${fmtSecs((s.avg_stage_s || {}).render)}</b><span>avg animate</span></div>
        <div class="stat"><b>${fmtSecs((s.avg_stage_s || {}).voice)}</b><span>avg voice</span></div>
        <div class="stat"><b>${fmtSecs((s.avg_stage_s || {}).assemble)}</b><span>avg assemble</span></div>
      </div>
      <h4>Engines (scenes · tries · done · cards · 1st-try)</h4>
      <table class="stat-table"><tr><th>Engine</th><th>Scenes</th><th>Tries</th><th>Done</th><th>Cards</th><th>1st-try</th></tr>${rows || `<tr><td colspan="6" style="color:var(--muted)">No scene data yet.</td></tr>`}</table>
      <h4>Top errors</h4>${errs}
      <h4>Voices</h4><p style="font-size:12.5px">${voices}</p>`;
  } catch (e) {
    body.innerHTML = `<p style="color:var(--accent2)">Couldn't load stats: ${esc(e.message)}</p>`;
  }
}
$("#statsBtn")?.addEventListener("click", openStats);
$("#statsClose")?.addEventListener("click", () => { statsOverlay.hidden = true; });
statsOverlay?.addEventListener("click", (e) => { if (e.target === statsOverlay) statsOverlay.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { statsOverlay.hidden = true; chatsDrawer.hidden = true; } });

// =====================================================================
// Analytics: time + cost per reel, and how that compares to other ways of making the video
// =====================================================================
const STAGE_SERIES = [["script", "Script"], ["voice", "Voice"], ["align", "Word sync"], ["plan", "Plan"], ["render", "Animate"], ["assemble", "Assemble"]];
const COST_SERIES = [["muse", "Muse (script, plan, scene code)"], ["tts", "Voice (Gemini TTS)"], ["compute", "Compute (render box)"], ["remotion", "Remotion license"]];
const money = (v, d = 3) => (v == null ? "—" : v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(d)}`);
const secs = (v) => (v == null ? "—" : v >= 60 ? `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, "0")}s` : `${Math.round(v)}s`);

let vizTip;
function tip(e, rows) {
  if (!vizTip) { vizTip = document.createElement("div"); vizTip.className = "viz-tip"; vizTip.setAttribute("role", "status"); document.body.append(vizTip); }
  if (!rows) { vizTip.hidden = true; return; }
  vizTip.replaceChildren(...rows.map(([v, l]) => { const d = document.createElement("div"); const b = document.createElement("b"); b.textContent = v; d.append(b, ` ${l}`); return d; }));
  vizTip.hidden = false;
  const x = Math.min(e.clientX + 14, innerWidth - vizTip.offsetWidth - 8), y = Math.max(8, e.clientY - vizTip.offsetHeight - 12);
  vizTip.style.left = `${x}px`; vizTip.style.top = `${y}px`;
}

// Horizontal stacked bars, one row per item; widths share one scale so rows compare.
function stackRows(rows, series, fmtv, label) {
  const max = Math.max(...rows.map((r) => series.reduce((a, [k]) => a + (r.values[k] || 0), 0)), 1e-9);
  const legend = `<div class="viz-legend">${series.map(([k, n], i) => `<span><i style="background:var(--s${i + 1})"></i>${esc(n)}</span>`).join("")}</div>`;
  const body = rows.map((r, ri) => {
    const total = series.reduce((a, [k]) => a + (r.values[k] || 0), 0);
    const segs = series.map(([k, n], i) => {
      const v = r.values[k] || 0;
      if (!v) return "";
      const w = (v / max) * 100;
      return `<span class="seg" style="width:${w}%;background:var(--s${i + 1})" data-r="${ri}" data-k="${k}" tabindex="0" aria-label="${esc(n)}: ${esc(fmtv(v))}">${w > 9 ? `<em>${esc(fmtv(v))}</em>` : ""}</span>`;
    }).join("");
    return `<div class="viz-row${r.emph ? " emph" : ""}"><div class="viz-label" title="${esc(r.title || r.label)}">${esc(r.label)}</div><div class="viz-track">${segs}<span class="viz-total">${esc(fmtv(total))}</span></div></div>`;
  }).join("");
  const html = `${legend}<div class="viz-rows" aria-label="${esc(label)}">${body}</div>`;
  const bind = (root) => {
    const onMove = (e) => {
      const seg = e.target.closest(".seg");
      if (!seg) return tip(e, null);
      const r = rows[+seg.dataset.r];
      tip(e, [[r.label, ""], ...series.filter(([k]) => r.values[k]).map(([k, n]) => [fmtv(r.values[k]), n])]);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", (e) => tip(e, null));
    root.addEventListener("focusin", (e) => { const b = e.target.getBoundingClientRect(); onMove({ target: e.target, clientX: b.left + b.width / 2, clientY: b.top }); });
    root.addEventListener("focusout", (e) => tip(e, null));
  };
  return { html, bind };
}

async function loadAnalytics() {
  const root = $("#analyticsBody");
  let d, t = null;
  try { d = await getJSON("/analytics/dashboard"); }
  catch (e) { root.innerHTML = `<p style="color:var(--bad);padding:40px 0">Couldn't load analytics: ${esc(e.message)}</p>`; return; }
  try { t = await getJSON("/analytics/telemetry?days=14"); } catch { t = null; }
  const S = d.summary;
  const done = d.reels.filter((r) => r.finished_first_run);
  const short = (t) => (t.length > 34 ? t.slice(0, 33) + "…" : t);
  const med = { label: "Median reel", emph: true, values: Object.fromEntries(STAGE_SERIES.map(([k]) => [k, S.stage_median_s[k] || 0])) };
  const timeChart = stackRows([med, ...done.map((r) => ({ label: short(r.topic), title: r.topic, values: r.stages }))], STAGE_SERIES, secs, "Time to reel by stage");
  const costChart = stackRows(done.map((r) => ({ label: short(r.topic), title: r.topic, values: r.cost })), COST_SERIES, (v) => money(v), "Cost per reel by component");
  const stageTot = STAGE_SERIES.reduce((a, [k]) => a + (S.stage_median_s[k] || 0), 0) || 1;
  const top = [...STAGE_SERIES].sort((a, b) => (S.stage_median_s[b[0]] || 0) - (S.stage_median_s[a[0]] || 0)).slice(0, 2);
  const ours = S.median_cost_per_minute;
  const lo = 0.1, hi = 100000, L = (v) => ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * 100;
  const comp = d.competitors.map((c) => {
    const isUs = c.low == null;
    const a = isUs ? ours : c.low, b = isUs ? (S.median_cost_list_price && S.median_reel_seconds ? S.median_cost_list_price / (S.median_reel_seconds / 60) : ours) : c.high;
    const ratio = ours && !isUs ? `${Math.round(c.low / ours).toLocaleString()}×` : "";
    return `<tr class="${isUs ? "us" : ""}"><td><b>${esc(c.name)}</b><br><small>${esc(c.kind)}</small></td>
      <td class="num">${a == null ? "—" : `${money(a, 2)}${b && b !== a ? `–${money(b, 2)}` : ""}`}</td>
      <td class="range-cell"><div class="range"><span style="left:${L(Math.max(a || lo, lo))}%;width:${Math.max(1.2, L(Math.max(b || a || lo, lo)) - L(Math.max(a || lo, lo)))}%" class="${isUs ? "us" : ""}"></span></div></td>
      <td class="num">${ratio}</td>
      <td><small>${esc(c.basis)}${c.source ? ` · <a href="${esc(c.source)}" target="_blank" rel="noopener">source</a>` : ""}</small></td></tr>`;
  }).join("");
  const tokensK = (r) => (r.tokens.output_tokens ? `${Math.round(r.tokens.input_tokens / 1000)}k / ${Math.round(r.tokens.output_tokens / 1000)}k` : "—");
  root.innerHTML = `
    <header class="viz-head"><h1>Analytics</h1><p>Time and cost for every reel, measured from each run's event log and usage ledger. Older reels made before the ledger existed are <b>estimated</b> from their saved code. Prices are public list prices; assumptions are at the bottom.</p></header>
    <section class="tiles">
      <div class="tile"><span>Median time to reel</span><b>${secs(S.median_time_s)}</b><small>${S.finished} finished reel${S.finished === 1 ? "" : "s"}</small></div>
      <div class="tile"><span>Median cost per reel</span><b>${money(S.median_cost, 2)}</b><small>${money(S.median_cost_list_price, 2)} at Muse list price</small></div>
      <div class="tile"><span>Cost per finished minute</span><b>${money(ours, 2)}</b><small>median reel ${secs(S.median_reel_seconds)} long</small></div>
      <div class="tile"><span>Where time goes</span><b>${esc(top.map(([k, n]) => n).join(" + "))}</b><small>${Math.round(top.reduce((a, [k]) => a + (S.stage_median_s[k] || 0), 0) / stageTot * 100)}% of the median run</small></div>
    </section>
    <section class="viz-card"><h2>Where the time goes</h2><p class="sub">First run of each reel, from request to finished video. Redos and rebakes later are not counted here.</p><div id="vizTime">${timeChart.html}</div></section>
    <section class="viz-card"><h2>Cost per reel</h2><p class="sub">Model calls + rendering. The Remotion line applies only once the company has more than 3 people (the Automators tier, $0.01 per render). Iteration spend from redos is in the table.</p><div id="vizCost">${costChart.html}</div></section>
    <section class="viz-card"><h2>Every reel</h2>
      <div class="table-wrap"><table class="viz-table">
        <thead><tr><th>Reel</th><th>Data</th><th class="num">Time</th><th class="num">Length</th><th class="num">Cost</th><th class="num">$/min</th><th class="num">Redo spend</th><th class="num">Renders</th><th class="num">Tokens in/out</th>${STAGE_SERIES.map(([, n]) => `<th class="num">${esc(n)}</th>`).join("")}</tr></thead>
        <tbody>${d.reels.map((r) => `<tr><td><a href="#/job/${esc(r.id)}">${esc(short(r.topic))}</a></td><td>${r.measured ? "measured" : "estimated"}</td><td class="num">${secs(r.time_to_reel_s)}</td><td class="num">${secs(r.reel_seconds)}</td><td class="num">${money(r.cost.total)}</td><td class="num">${money(r.cost_per_minute)}</td><td class="num">${money(r.cost.iteration)}</td><td class="num">${r.renders}</td><td class="num">${tokensK(r)}</td>${STAGE_SERIES.map(([k]) => `<td class="num">${secs(r.stages[k])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
      ${S.pitch_spend ? `<p class="sub">Storyboards and review-time prefetch spent ${money(S.pitch_spend)} in total, including storyboards that were never approved.</p>` : ""}
    </section>
    ${t ? `<section class="viz-card"><h2>Product funnel · last ${t.days} days</h2><p class="sub">${t.recent} events from ${t.unique_browsers} browser${t.unique_browsers === 1 ? "" : "s"}. Local-first beacons; prompts are never stored (lengths only).</p>
      <section class="tiles">
        ${Object.entries(t.funnel || {}).map(([k, v]) => `<div class="tile"><span>${esc(k.replace(/_/g, " "))}</span><b>${v}</b></div>`).join("")}
      </section>
      ${Object.keys(t.by_day || {}).length ? `<p class="sub">Daily volume: ${Object.entries(t.by_day).map(([day, n]) => `${esc(day)} · ${n}`).join(" — ")}</p>` : `<p class="sub">No product events yet — visit home and the studio to generate some.</p>`}
      ${Object.keys(t.by_event || {}).length ? `<div class="table-wrap"><table class="viz-table"><thead><tr><th>Event</th><th class="num">Count</th></tr></thead><tbody>${Object.entries(t.by_event).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table></div>` : ""}
    </section>` : ""}
    <section class="viz-card"><h2>Compared with other ways to make it</h2><p class="sub">Dollars per finished minute, log scale (each gridline is 10×). Ranges come from each vendor's public pricing; human-production ranges come from agency price guides. Per-minute SaaS figures are derived from plan caps.</p>
      <div class="table-wrap"><table class="viz-table comp"><thead><tr><th>Option</th><th class="num">$ / min</th><th class="range-head"><span>$0.1</span><span>$1</span><span>$10</span><span>$100</span><span>$1k</span><span>$10k</span><span>$100k</span></th><th class="num">vs us</th><th>Basis</th></tr></thead><tbody>${comp}</tbody></table></div>
    </section>
    <section class="viz-card"><h2>Assumptions</h2><ul class="assume">
      <li>Muse model <code>${esc(d.prices.muse_model)}</code>: ${esc(d.prices.muse_contributor_note)}. Standard list price $${d.prices.price_muse_input_per_m}/M input, $${d.prices.price_muse_output_per_m}/M output (reasoning tokens bill as output).</li>
      <li>Gemini TTS $${d.prices.price_tts_audio_output_per_m}/M audio tokens (25 per second of speech) + $${d.prices.price_tts_input_per_m}/M text. The free tier costs $0 but rate-limits hard: that's where the slow voice runs come from.</li>
      <li>Compute ${money(d.prices.price_compute_per_hour, 2)}/hour for the render box, charged for the whole run's wall time. Remotion ${money(d.prices.price_remotion_per_render, 2)} per render.</li>
      <li>Override any price in <code>.env</code> (e.g. <code>PRICE_MUSE_OUTPUT_PER_M=4.25</code>).</li>
    </ul></section>`;
  timeChart.bind($("#vizTime")); costChart.bind($("#vizCost"));
}

route();
