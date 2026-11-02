import React from "react";
import { CodePanel, LinkedList, Slot, Stage, sec } from "@kit";

export default function Scene() {
  return (
    <Stage title="Flip every link backwards" kicker="LeetCode 206">
      <Slot area="main">
        <LinkedList
          values={[1, 2, 3, 4]}
          steps={[
            { at: sec(0.2), pointers: { curr: 0 }, mark: { 0: "active" }, note: "prev = None, curr = 1" },
            { at: sec(1.74), links: { 0: null }, pointers: { prev: 0, curr: 1 }, mark: { 0: "done", 1: "active" }, note: "1 -> null" },
            { at: sec(3.66), links: { 1: 0 }, pointers: { prev: 1, curr: 2 }, mark: { 0: "done", 1: "done", 2: "active" }, note: "2 -> 1" },
            { at: sec(5.97), links: { 2: 1 }, pointers: { prev: 2, curr: 3 }, mark: { 0: "done", 1: "done", 2: "done", 3: "active" }, note: "3 -> 2" },
            { at: sec(7.12), links: { 3: 2 }, pointers: { prev: 3, curr: null }, mark: { 0: "done", 1: "done", 2: "done", 3: "active" }, note: "4 -> 3" },
            { at: sec(8.28), pointers: { prev: 3, curr: null }, mark: { 0: "done", 1: "done", 2: "done", 3: "found" }, note: "4 is new head" },
          ]}
        />
      </Slot>
      <Slot area="below" at={sec(0.2)}>
        <CodePanel
          lang="python"
          title="reverseList"
          code={"nxt = curr.next\ncurr.next = prev\nprev, curr = curr, nxt"}
          steps={[
            { at: sec(0.2), line: 1 },
            { at: sec(1.74), line: 2 },
            { at: sec(3.66), line: 2 },
            { at: sec(5.97), line: 2 },
            { at: sec(7.12), line: 2 },
            { at: sec(8.28), line: 3 },
          ]}
        />
      </Slot>
    </Stage>
  );
}