import React from "react";
import { ArrayView, Slot, Stage, StringView, sec } from "@kit";

export const frames = [100, 170];
// Longest substring without repeating characters + a swap demo
export default function D2() {
  return (
    <Stage title="Sliding window">
      <Slot area="main" style={{ justifyContent: "flex-start", gap: 60 }}>
        <StringView
          label="s"
          text="abcabcbb"
          steps={[
            { at: sec(0.3), window: [0, 0], pointers: { L: 0, R: 0 } },
            { at: sec(1.2), window: [0, 2], pointers: { R: 2 }, note: "abc → len 3" },
            { at: sec(2.4), window: [1, 3], pointers: { L: 1, R: 3 }, mark: { 0: "dim", 3: "active" }, note: "a repeats → move L" },
          ]}
        />
        <ArrayView label="swap" values={[5, 3, 8]} steps={[{ at: sec(4), swap: [0, 1], mark: { 0: "swap", 1: "swap" } }, { at: sec(5), mark: { 0: "done", 1: "done", 2: "done" } }]} cell={110} />
      </Slot>
    </Stage>
  );
}
