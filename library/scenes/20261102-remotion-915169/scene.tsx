import React from "react";
import { ArrayView, Slot, Stage, VarWatch, sec } from "@kit";

export default function Scene() {
  return (
    <Stage title="Squeeze from both ends" kicker="LeetCode 167">
      <Slot area="main">
        <ArrayView
          label="numbers"
          values={[1, 2, 4, 5, 7, 11]}
          showIndex
          steps={[
            { at: sec(0.2), pointers: { l: 0, r: 5 }, mark: { 0: "compare", 5: "compare" }, note: "1 + 11 = 12" },
            { at: sec(2.51), pointers: { l: 0, r: 4 }, mark: { 0: "compare", 4: "compare", 5: "dim" }, note: "12 > 9 -> move r" },
            { at: sec(5.58), pointers: { l: 0, r: 4 }, mark: { 0: "compare", 4: "compare", 5: "dim" }, note: "1 + 7 = 8" },
            { at: sec(9.82), pointers: { l: 1, r: 4 }, mark: { 0: "dim", 1: "compare", 4: "compare", 5: "dim" }, note: "2 + 7 = 9" },
            { at: sec(11.74), pointers: { l: 1, r: 4 }, mark: { 0: "dim", 1: "found", 4: "found", 5: "dim" }, window: [1, 4], note: "9 = target" },
          ]}
        />
      </Slot>
      <Slot area="below" at={sec(0.2)}>
        <VarWatch
          vars={{ target: 9 }}
          steps={[
            { at: sec(0.2), vars: { target: 9, sum: 12 } },
            { at: sec(5.58), vars: { target: 9, sum: 8 } },
            { at: sec(9.82), vars: { target: 9, sum: 9 } },
          ]}
        />
      </Slot>
    </Stage>
  );
}