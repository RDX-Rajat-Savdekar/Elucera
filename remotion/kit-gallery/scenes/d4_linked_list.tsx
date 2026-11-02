import React from "react";
import { LinkedList, Slot, Stage, sec } from "@kit";

export const frames = [60, 150, 230];
// Reverse a linked list
export default function D4() {
  return (
    <Stage title="Reverse a linked list" kicker="LeetCode 206">
      <Slot area="main">
        <LinkedList
          label="head"
          values={[1, 2, 3, 4]}
          steps={[
            { at: sec(0.4), pointers: { prev: null, curr: 0 }, note: "prev = null, curr = head" },
            { at: sec(1.6), links: { 0: null }, pointers: { prev: 0, curr: 1 }, mark: { 0: "done" }, note: "1.next → null" },
            { at: sec(3), links: { 1: 0 }, pointers: { prev: 1, curr: 2 }, mark: { 0: "done", 1: "done" }, note: "2.next → 1" },
            { at: sec(4.4), links: { 2: 1, 3: 2 }, pointers: { prev: 3, curr: null }, mark: { 0: "done", 1: "done", 2: "done", 3: "found" }, note: "new head = 4" },
          ]}
        />
      </Slot>
    </Stage>
  );
}
