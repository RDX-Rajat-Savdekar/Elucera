import React from "react";
import { BinaryTree, Slot, Stage, sec } from "@kit";

export const frames = [100, 200];
// Max depth with in-order visit numbers and depth badges
export default function D6() {
  return (
    <Stage title="Maximum depth" kicker="LeetCode 104">
      <Slot area="main">
        <BinaryTree
          tree={[3, 9, 20, null, null, 15, 7]}
          steps={[
            { at: sec(0.4), active: "0", mark: { "0": "active" } },
            { at: sec(1.4), active: "1", mark: { "1": "done" }, badge: { "1": "1" }, edgeMark: { "1": "path" }, visit: ["1"] },
            { at: sec(2.6), active: "5", mark: { "1": "done", "5": "done", "6": "done" }, badge: { "5": "1", "6": "1" }, visit: ["1", "5", "6"] },
            { at: sec(3.8), active: "0", mark: { "1": "done", "5": "done", "6": "done", "2": "done", "0": "found" }, badge: { "2": "2", "0": "3" }, edgeMark: { "2": "path", "5": "path" }, note: "depth = 1 + max(1, 2) = 3" },
          ]}
        />
      </Slot>
    </Stage>
  );
}
