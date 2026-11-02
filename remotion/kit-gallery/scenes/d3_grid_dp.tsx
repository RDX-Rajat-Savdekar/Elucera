import React from "react";
import { Grid, Slot, Stage, sec } from "@kit";

export const frames = [130, 200];
// Edit distance "cat" → "cut"
export default function D3() {
  const empty = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null as number | null));
  return (
    <Stage title="Edit distance DP">
      <Slot area="main">
        <Grid
          data={empty}
          rowLabels={["", "c", "a", "t"]}
          colLabels={["", "c", "u", "t"]}
          steps={[
            { at: sec(0.3), set: [[0, 0, 0], [0, 1, 1], [0, 2, 2], [0, 3, 3], [1, 0, 1], [2, 0, 2], [3, 0, 3]] },
            { at: sec(1.2), set: [[1, 1, 0]], active: [1, 1], deps: [[0, 0]], note: "c = c → copy diagonal" },
            { at: sec(2.4), set: [[1, 2, 1], [1, 3, 2], [2, 1, 1]], active: [2, 2], deps: [[1, 1], [1, 2], [2, 1]], note: "a ≠ u → 1 + min(3 neighbours)" },
            { at: sec(3.6), set: [[2, 2, 1], [2, 3, 2], [3, 1, 2], [3, 2, 2], [3, 3, 1]], active: [3, 3], deps: [[2, 2]], mark: { "3,3": "found" }, note: "answer = 1" },
          ]}
        />
      </Slot>
    </Stage>
  );
}
