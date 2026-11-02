import React from "react";
import { theme, type State } from "../../theme";
import { mix } from "../anim";
import { type Marks, Note, StructLabel, type Val, fitSize, fmt, mergeNullable, stateColors, useSteps } from "./common";

type Node = { id: string; label: Val; x: number; y: number; parent: string | null; end?: boolean };

type TreeState = { mark: Partial<Record<string, State>>; edgeMark: Partial<Record<string, State>>; badge: Partial<Record<string, string>>; visit: string[]; hidden: string[]; note: string; active: string | null };
export type TreeStep = {
  at: number;
  /** node states by id; REPLACES */
  mark?: Partial<Record<string, State>>;
  /** edge states keyed by CHILD id; REPLACES */
  edgeMark?: Partial<Record<string, State>>;
  /** small value badges next to nodes (height, sum, dist); MERGES, null removes */
  badge?: Partial<Record<string, string | null>>;
  /** traversal order so far: numbers 1..k appear beside these nodes */
  visit?: string[];
  /** nodes not yet in the tree (e.g. before a BST insert) */
  hidden?: string[];
  /** the node being processed (yellow ring); null clears */
  active?: string | null;
  note?: string;
};

const reduceTree = (s: TreeState, st: TreeStep): TreeState => ({
  mark: st.mark ?? s.mark,
  edgeMark: st.edgeMark ?? s.edgeMark,
  badge: mergeNullable(s.badge, st.badge),
  visit: st.visit ?? s.visit,
  hidden: st.hidden ?? s.hidden,
  note: st.note ?? s.note,
  active: st.active === undefined ? s.active : st.active,
});

/** Shared renderer: edges, nodes with states, badges, visit-order numbers, hidden nodes. */
const TreeCanvas: React.FC<{ nodes: Node[]; steps?: TreeStep[]; width: number; height: number; r: number; label?: string; extra?: (t: number) => React.ReactNode; valueAt?: (id: string, t: number) => { label: Val; dx: number; dy: number } | null }> = ({
  nodes,
  steps,
  width,
  height,
  r,
  label,
  extra,
  valueAt,
}) => {
  const base: TreeState = { mark: {}, edgeMark: {}, badge: {}, visit: [], hidden: [], note: "", active: null };
  const { prev, cur, t } = useSteps<TreeState, TreeStep>(base, steps, reduceTree);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const vis = (s: TreeState, id: string) => !s.hidden.includes(id);
  const op = (id: string) => (vis(cur, id) ? (vis(prev, id) ? 1 : t) : vis(prev, id) ? 1 - t : 0);
  const fs = fitSize(nodes.reduce((m, n) => (fmt(n.label).length > m.length ? fmt(n.label) : m), ""), r * 2, r * 0.9);
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height: height + 70 }}>
      <StructLabel text={label} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {nodes.map((n) => {
          if (!n.parent) return null;
          const p = byId[n.parent];
          const col = stateColors(prev.edgeMark[n.id], cur.edgeMark[n.id], t);
          const o = Math.min(op(n.id), op(p.id));
          const on = cur.edgeMark[n.id] !== undefined;
          return <line key={`e${n.id}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={on ? col.stroke : theme.line} strokeWidth={on ? 9 : 6} opacity={o} strokeLinecap="round" />;
        })}
      </svg>
      {nodes.map((n) => {
        const o = op(n.id);
        if (o <= 0.01) return null;
        const col = stateColors(prev.mark[n.id], cur.mark[n.id], t);
        const isActive = cur.active === n.id;
        const v = valueAt ? valueAt(n.id, t) : null;
        return (
          <div key={n.id} style={{ position: "absolute", left: n.x - r, top: n.y - r, width: r * 2, height: r * 2, opacity: o, transform: `scale(${0.6 + 0.4 * o})` }}>
            <div style={{ width: r * 2, height: r * 2, borderRadius: "50%", background: col.fill, border: `${isActive ? 8 : 5}px solid ${isActive ? theme.accent3 : col.stroke}`, boxSizing: "border-box", boxShadow: n.end ? `0 0 0 6px ${theme.bg}, 0 0 0 10px ${theme.good}` : undefined }} />
            {!v && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: fs, color: col.text }}>{fmt(n.label)}</div>}
          </div>
        );
      })}
      {valueAt &&
        nodes.map((n) => {
          const v = valueAt(n.id, t);
          if (!v) return null;
          const col = stateColors(prev.mark[n.id], cur.mark[n.id], t);
          return (
            <div key={`v${n.id}`} style={{ position: "absolute", left: n.x - r + v.dx, top: n.y - r + v.dy, width: r * 2, height: r * 2, display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: fs, color: col.text, opacity: op(n.id) }}>
              {fmt(v.label)}
            </div>
          );
        })}
      {nodes.map((n) => {
        const b = cur.badge[n.id];
        const i = cur.visit.indexOf(n.id);
        return (
          <React.Fragment key={`b${n.id}`}>
            {b !== undefined && (
              <div style={{ position: "absolute", left: n.x + r * 0.7, top: n.y - r * 1.45, padding: "4px 14px", borderRadius: 12, background: theme.accent2, color: theme.fg, fontFamily: theme.mono, fontWeight: 900, fontSize: Math.max(26, r * 0.5), opacity: prev.badge[n.id] === b ? 1 : t, whiteSpace: "nowrap" }}>{b}</div>
            )}
            {i >= 0 && (
              <div style={{ position: "absolute", left: n.x - r * 1.75, top: n.y - r * 1.2, width: r * 0.95, height: r * 0.95, borderRadius: "50%", background: theme.accent3, color: "#0B0F19", display: "grid", placeItems: "center", fontFamily: theme.mono, fontWeight: 900, fontSize: Math.max(22, r * 0.45), opacity: prev.visit.includes(n.id) ? 1 : t }}>{i + 1}</div>
            )}
          </React.Fragment>
        );
      })}
      {extra?.(t)}
      <Note prev={prev.note} cur={cur.note} t={t} top={height + 8} width={width} />
    </div>
  );
};

/** Parse LeetCode level-order `[3,9,20,null,null,15,7]`; node id = its index in that array (as a string). */
export function parseLevelOrder(arr: (Val | null)[]) {
  type T = { id: string; label: Val; left?: T; right?: T; depth: number; parent: string | null };
  if (!arr.length || arr[0] === null) return [] as T[];
  const root: T = { id: "0", label: arr[0]!, depth: 0, parent: null };
  const all: T[] = [root];
  const q: T[] = [root];
  let i = 1;
  while (q.length && i < arr.length) {
    const n = q.shift()!;
    for (const side of ["left", "right"] as const) {
      if (i < arr.length) {
        const v = arr[i];
        if (v !== null && v !== undefined) {
          const c: T = { id: String(i), label: v, depth: n.depth + 1, parent: n.id };
          n[side] = c;
          all.push(c);
          q.push(c);
        }
        i++;
      }
    }
  }
  return all;
}

/**
 * Binary tree / BST from LeetCode level-order (`null` = missing child). Node ids are array indices as strings,
 * e.g. tree=[3,9,20,null,null,15,7] → "0"=3, "1"=9, "2"=20, "5"=15, "6"=7. Laid out by in-order position.
 */
export const BinaryTree: React.FC<{ tree: (Val | null)[]; steps?: TreeStep[]; label?: string; width?: number; height?: number }> = ({ tree, steps, label, width = 960, height = 640 }) => {
  const all = parseLevelOrder(tree);
  const byId = Object.fromEntries(all.map((n) => [n.id, n]));
  const order: string[] = [];
  const walk = (id?: string) => {
    if (!id) return;
    const n = byId[id] as (typeof all)[number];
    walk(n.left?.id);
    order.push(id);
    walk(n.right?.id);
  };
  walk(all[0]?.id);
  const depth = Math.max(0, ...all.map((n) => n.depth));
  const r = Math.min(64, Math.floor(width / (order.length * 2.4 + 1)), Math.floor(height / (depth * 2.6 + 2.4)));
  const levelH = depth ? (height - 2 * r - 20) / depth : 0;
  const nodes: Node[] = all.map((n) => ({ id: n.id, label: n.label, parent: n.parent, x: r + 10 + (order.indexOf(n.id) + 0.5) * ((width - 2 * r - 20) / order.length), y: r + 10 + n.depth * levelH }));
  return <TreeCanvas nodes={nodes} steps={steps} width={width} height={height} r={r} label={label} />;
};

/** Generic rooted tree from nested {label, children}. Node ids are paths: "0", "0.1", "0.1.0" … */
export type NestedNode = { label: Val; children?: NestedNode[]; end?: boolean };
function tidy(root: NestedNode, width: number, height: number) {
  const flat: { id: string; label: Val; parent: string | null; depth: number; leafX?: number; end?: boolean; kids: string[] }[] = [];
  let leaf = 0;
  const visit = (n: NestedNode, id: string, parent: string | null, depth: number) => {
    const me: (typeof flat)[number] = { id, label: n.label, parent, depth, end: n.end, kids: [] };
    flat.push(me);
    (n.children ?? []).forEach((c, i) => {
      me.kids.push(`${id}.${i}`);
      visit(c, `${id}.${i}`, id, depth + 1);
    });
    if (!n.children?.length) me.leafX = leaf++;
  };
  visit(root, "0", null, 0);
  const byId = Object.fromEntries(flat.map((f) => [f.id, f]));
  const xOf = (id: string): number => {
    const f = byId[id];
    if (f.leafX !== undefined) return f.leafX;
    const xs = f.kids.map(xOf);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  };
  const depth = Math.max(...flat.map((f) => f.depth));
  const r = Math.min(60, Math.floor(width / (leaf * 2.4 + 1)), Math.floor(height / (depth * 2.6 + 2.4)));
  const levelH = depth ? (height - 2 * r - 20) / depth : 0;
  const colW = (width - 2 * r - 20) / Math.max(1, leaf);
  const nodes: Node[] = flat.map((f) => ({ id: f.id, label: f.label, parent: f.parent, end: f.end, x: r + 10 + (xOf(f.id) + 0.5) * colW, y: r + 10 + f.depth * levelH }));
  return { nodes, r };
}

/** Recursion tree (fib, subsets, permutations, backtracking). Use `hidden` to reveal calls in order and `badge` for return values. */
export const RecursionTree: React.FC<{ root: NestedNode; steps?: TreeStep[]; label?: string; width?: number; height?: number }> = ({ root, steps, label, width = 960, height = 640 }) => {
  const { nodes, r } = tidy(root, width, height);
  return <TreeCanvas nodes={nodes} steps={steps} width={width} height={height} r={r} label={label} />;
};

/** Trie built from `words`. Node ids are the PREFIX they spell ("" is the root, "ca", "cat"); word ends get a green ring. */
export const Trie: React.FC<{ words: string[]; steps?: TreeStep[]; label?: string; width?: number; height?: number }> = ({ words, steps, label, width = 960, height = 640 }) => {
  type TN = NestedNode & { prefix: string; map: Record<string, TN> };
  const root: TN = { label: "•", prefix: "", children: [], map: {} };
  for (const w of words) {
    let n = root;
    for (const ch of w) {
      if (!n.map[ch]) {
        const c: TN = { label: ch, prefix: n.prefix + ch, children: [], map: {} };
        n.map[ch] = c;
        n.children!.push(c);
      }
      n = n.map[ch];
    }
    n.end = true;
  }
  const { nodes, r } = tidy(root, width, height);
  // re-key nodes by prefix so steps can say mark: { "ca": "path" }
  const pathToPrefix: Record<string, string> = {};
  const walk = (n: TN, id: string) => {
    pathToPrefix[id] = n.prefix;
    (n.children as TN[]).forEach((c, i) => walk(c, `${id}.${i}`));
  };
  walk(root, "0");
  const keyed = nodes.map((n) => ({ ...n, id: pathToPrefix[n.id], parent: n.parent === null ? null : pathToPrefix[n.parent] }));
  return <TreeCanvas nodes={keyed} steps={steps} width={width} height={height} r={r} label={label} />;
};

/**
 * Binary heap shown as a tree AND as its backing array (kept in sync). Node ids are array indices ("0".."n-1").
 * Steps: `values` (replace), `swap: [i, j]` (animated sift), `mark`, `note`.
 */
export const Heap: React.FC<{ values: Val[]; steps?: (TreeStep & { values?: Val[]; swap?: [number, number] })[]; label?: string; width?: number }> = ({ values, steps, label = "heap", width = 960 }) => {
  type HS = { values: Val[]; swap: [number, number] | null };
  const { prev, cur, t } = useSteps<HS, NonNullable<typeof steps>[number]>({ values, swap: null }, steps, (s, st) => {
    const v = st.values ? [...st.values] : [...s.values];
    if (st.swap) [v[st.swap[0]], v[st.swap[1]]] = [v[st.swap[1]], v[st.swap[0]]];
    return { values: v, swap: st.swap ?? null };
  });
  const n = cur.values.length;
  const depth = Math.floor(Math.log2(Math.max(1, n)));
  const treeH = 460;
  const r = Math.min(56, Math.floor(width / (Math.pow(2, depth) * 2.4 + 1)));
  const levelH = depth ? (treeH - 2 * r - 20) / depth : 0;
  const nodes: Node[] = cur.values.map((v, i) => {
    const d = Math.floor(Math.log2(i + 1));
    const k = i - (Math.pow(2, d) - 1);
    const slots = Math.pow(2, d);
    return { id: String(i), label: v, parent: i === 0 ? null : String(Math.floor((i - 1) / 2)), x: ((k + 0.5) / slots) * width, y: r + 10 + d * levelH };
  });
  const sw = cur.swap && t < 1 ? cur.swap : null;
  const valueAt = (id: string) => {
    const i = +id;
    if (!sw || (i !== sw[0] && i !== sw[1])) return { label: cur.values[i], dx: 0, dy: 0 };
    const from = i === sw[0] ? sw[1] : sw[0];
    return { label: cur.values[i], dx: (nodes[from].x - nodes[i].x) * (1 - t), dy: (nodes[from].y - nodes[i].y) * (1 - t) };
  };
  const cell = Math.min(100, Math.floor((width - 10 * (n - 1)) / Math.max(1, n)));
  const arrX = (i: number) => (width - (n * cell + (n - 1) * 10)) / 2 + i * (cell + 10);
  const extra = (tt: number) => (
    <div style={{ position: "absolute", top: treeH + 30, left: 0, width }}>
      {cur.values.map((v, i) => {
        let left = arrX(i);
        if (sw && (i === sw[0] || i === sw[1])) left = mix(arrX(i === sw[0] ? sw[1] : sw[0]), arrX(i), tt);
        return (
          <div key={i} style={{ position: "absolute", left, width: cell, height: cell, borderRadius: 16, background: theme.panel, border: `4px solid ${sw && (i === sw[0] || i === sw[1]) ? theme.accent2 : theme.line}`, boxSizing: "border-box", display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: fitSize(fmt(v), cell, cell * 0.42), color: theme.fg }}>
            {fmt(v)}
          </div>
        );
      })}
      {cur.values.map((_, i) => (
        <div key={`ix${i}`} style={{ position: "absolute", top: cell + 6, left: arrX(i), width: cell, textAlign: "center", fontFamily: theme.mono, fontSize: 28, color: theme.muted }}>{i}</div>
      ))}
    </div>
  );
  void prev;
  return <TreeCanvas nodes={nodes} steps={steps} width={width} height={treeH + cell + 80} r={r} label={label} extra={extra} valueAt={(id) => valueAt(id)} />;
};

// ─────────────────────────────── Graph ───────────────────────────────

export type GraphNode = { id: string; x?: number; y?: number; label?: Val };
export type GraphEdge = { from: string; to: string; w?: Val; directed?: boolean };
export type GraphStep = TreeStep & {
  /** edge states keyed "a-b" (order-insensitive for undirected edges); REPLACES */
  edgeMark?: Partial<Record<string, State>>;
};

/**
 * Graph in a 960×640 box. Give node x/y (box coords) or omit them for a circle layout. Weighted edges show `w`.
 * Steps: mark (nodes), edgeMark ("a-b"), badge (dist / color / discovery time), visit, active, note.
 */
export const Graph: React.FC<{ nodes: GraphNode[]; edges: GraphEdge[]; steps?: GraphStep[]; label?: string; width?: number; height?: number; directed?: boolean }> = ({
  nodes,
  edges,
  steps,
  label,
  width = 960,
  height = 640,
  directed = false,
}) => {
  const base: TreeState = { mark: {}, edgeMark: {}, badge: {}, visit: [], hidden: [], note: "", active: null };
  const { prev, cur, t } = useSteps<TreeState, GraphStep>(base, steps, reduceTree);
  const n = nodes.length;
  const r = Math.min(62, Math.floor(Math.min(width, height) / (n > 8 ? 9 : 7)));
  const pos = Object.fromEntries(
    nodes.map((nd, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return [nd.id, { x: nd.x ?? width / 2 + Math.cos(a) * (width / 2 - r - 30), y: nd.y ?? height / 2 + Math.sin(a) * (height / 2 - r - 30) }];
    }),
  );
  const ek = (a: string, b: string) => `${a}-${b}`;
  const edgeState = (s: TreeState, e: GraphEdge) => s.edgeMark[ek(e.from, e.to)] ?? (e.directed || directed ? undefined : s.edgeMark[ek(e.to, e.from)]);
  const vis = (s: TreeState, id: string) => !s.hidden.includes(id);
  const op = (id: string) => (vis(cur, id) ? (vis(prev, id) ? 1 : t) : vis(prev, id) ? 1 - t : 0);
  return (
    <div style={{ position: "relative", marginTop: label ? 70 : 0, width, height: height + 70 }}>
      <StructLabel text={label} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <marker id="gh" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill={theme.line} /></marker>
          <marker id="gha" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill={theme.accent3} /></marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          const st = edgeState(cur, e);
          const col = stateColors(edgeState(prev, e), st, t);
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          const x1 = a.x + ux * r, y1 = a.y + uy * r, x2 = b.x - ux * (r + 6), y2 = b.y - uy * (r + 6);
          const isDir = e.directed ?? directed;
          const on = st !== undefined;
          const o = Math.min(op(e.from), op(e.to));
          return (
            <g key={i} opacity={o}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? col.stroke : theme.line} strokeWidth={on ? 9 : 6} strokeLinecap="round" markerEnd={isDir ? `url(#${on ? "gha" : "gh"})` : undefined} />
              {e.w !== undefined && (
                <text x={(x1 + x2) / 2 - uy * 34} y={(y1 + y2) / 2 + ux * 34 + 12} textAnchor="middle" fontFamily={theme.mono} fontWeight={900} fontSize={34} fill={on ? col.stroke : theme.muted} stroke={theme.bg} strokeWidth={8} paintOrder="stroke">{fmt(e.w)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((nd) => {
        const p = pos[nd.id];
        const o = op(nd.id);
        if (o <= 0.01) return null;
        const col = stateColors(prev.mark[nd.id], cur.mark[nd.id], t);
        const isActive = cur.active === nd.id;
        const b = cur.badge[nd.id];
        const vi = cur.visit.indexOf(nd.id);
        return (
          <React.Fragment key={nd.id}>
            <div style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: col.fill, border: `${isActive ? 8 : 5}px solid ${isActive ? theme.accent3 : col.stroke}`, boxSizing: "border-box", display: "grid", placeItems: "center", fontFamily: theme.font, fontWeight: 900, fontSize: fitSize(fmt(nd.label ?? nd.id), r * 2, r * 0.85), color: col.text, opacity: o }}>
              {fmt(nd.label ?? nd.id)}
            </div>
            {b !== undefined && (
              <div style={{ position: "absolute", left: p.x + r * 0.6, top: p.y - r * 1.5, padding: "4px 14px", borderRadius: 12, background: theme.accent2, color: theme.fg, fontFamily: theme.mono, fontWeight: 900, fontSize: 30, opacity: prev.badge[nd.id] === b ? 1 : t, whiteSpace: "nowrap" }}>{b}</div>
            )}
            {vi >= 0 && (
              <div style={{ position: "absolute", left: p.x - r * 1.7, top: p.y - r * 1.25, width: 46, height: 46, borderRadius: "50%", background: theme.accent3, color: "#0B0F19", display: "grid", placeItems: "center", fontFamily: theme.mono, fontWeight: 900, fontSize: 26, opacity: prev.visit.includes(nd.id) ? 1 : t }}>{vi + 1}</div>
            )}
          </React.Fragment>
        );
      })}
      <Note prev={prev.note} cur={cur.note} t={t} top={height + 8} width={width} />
    </div>
  );
};
