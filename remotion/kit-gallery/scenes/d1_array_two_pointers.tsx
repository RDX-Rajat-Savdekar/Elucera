import React from "react";
import { ArrayView, Slot, Stage, VarWatch, sec } from "@kit";

export const frames = [40, 75, 200];
// Two Sum II: sorted array, target 9
export default function D1() {
  return (
    <Stage title="Two pointers" kicker="LeetCode 167">
      <Slot area="main">
        <ArrayView
          label="numbers"
          values={[1, 2, 4, 5, 7, 11]}
          steps={[
            { at: sec(0.5), pointers: { l: 0, r: 5 }, mark: { 0: "compare", 5: "compare" }, note: "1 + 11 = 12 > 9" },
            { at: sec(2), pointers: { r: 4 }, mark: { 0: "compare", 4: "compare", 5: "dim" }, note: "1 + 7 = 8 < 9" },
            { at: sec(3.5), pointers: { l: 1 }, mark: { 1: "compare", 4: "compare", 0: "dim", 5: "dim" }, note: "2 + 7 = 9 ✓" },
            { at: sec(5), mark: { 1: "found", 4: "found", 0: "dim", 5: "dim", 2: "dim", 3: "dim" }, window: [1, 4] },
          ]}
        />
      </Slot>
      <Slot area="below">
        <VarWatch vars={{ target: 9 }} steps={[{ at: sec(0.5), vars: { sum: 12 } }, { at: sec(2), vars: { sum: 8 } }, { at: sec(3.5), vars: { sum: 9 } }]} />
      </Slot>
    </Stage>
  );
}
