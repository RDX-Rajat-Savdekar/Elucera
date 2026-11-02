import React from "react";
import { Heap, Slot, Stage, Trie, sec } from "@kit";

export const frames = [45, 120, 230];
export default function D8() {
  return (
    <Stage title="Heap and trie" titleOutAt={sec(5)}>
      <Slot area="main" outAt={sec(5)}>
        <Heap values={[1, 3, 2, 7, 5, 4, 9]} steps={[{ at: sec(0.3), values: [1, 3, 2, 7, 5, 4, 9, 0], mark: { "7": "active" } }, { at: sec(1.4), swap: [7, 3], mark: { "3": "swap", "7": "swap" } }, { at: sec(2.6), swap: [3, 1], mark: { "1": "swap", "3": "swap" } }, { at: sec(3.6), swap: [1, 0], mark: { "0": "found" } }]} />
      </Slot>
      <Slot area="main" at={sec(5.3)}>
        <Trie words={["cat", "car", "cart", "dog", "do"]} steps={[{ at: sec(6), mark: { "": "visited", c: "path", ca: "path", car: "path", cart: "found" }, edgeMark: { c: "path", ca: "path", car: "path", cart: "path" }, note: "search \"cart\"" }]} />
      </Slot>
    </Stage>
  );
}
