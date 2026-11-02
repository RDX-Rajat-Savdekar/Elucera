import React from "react";
import { Graph, SeqView, Slot, Stage, sec } from "@kit";

export const frames = [120, 200];
export default function D7() {
  const nodes = [{ id: "A", x: 480, y: 70 }, { id: "B", x: 200, y: 280 }, { id: "C", x: 760, y: 280 }, { id: "D", x: 120, y: 540 }, { id: "E", x: 480, y: 540 }, { id: "F", x: 840, y: 540 }];
  const edges = [{ from: "A", to: "B", w: 4 }, { from: "A", to: "C", w: 1 }, { from: "B", to: "D", w: 2 }, { from: "B", to: "E", w: 5 }, { from: "C", to: "E", w: 8 }, { from: "C", to: "F", w: 3 }];
  return (
    <Stage title="Breadth-first search">
      <Slot area="main">
        <Graph
          nodes={nodes}
          edges={edges}
          steps={[
            { at: sec(0.4), mark: { A: "active" }, badge: { A: "0" }, visit: ["A"] },
            { at: sec(1.6), mark: { A: "done", B: "frontier", C: "frontier" }, edgeMark: { "A-B": "path", "A-C": "path" }, badge: { B: "1", C: "1" }, visit: ["A"] },
            { at: sec(3), mark: { A: "done", B: "done", C: "done", D: "frontier", E: "frontier", F: "frontier" }, edgeMark: { "A-B": "path", "A-C": "path", "B-D": "path", "B-E": "path", "C-F": "path" }, badge: { D: "2", E: "2", F: "2" }, visit: ["A", "B", "C"], note: "level 2" },
          ]}
        />
      </Slot>
      <Slot area="below">
        <SeqView kind="queue" steps={[{ at: sec(0.4), items: ["A"] }, { at: sec(1.6), items: ["B", "C"] }, { at: sec(3), items: ["D", "E", "F"] }]} maxItems={6} />
      </Slot>
    </Stage>
  );
}
