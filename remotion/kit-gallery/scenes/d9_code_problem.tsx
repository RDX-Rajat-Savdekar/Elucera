import React from "react";
import { CodePanel, Complexity, ProblemCard, Slot, Stage, sec } from "@kit";

export const frames = [60, 150, 260];
const code = `def twoSum(nums, target):
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i`;
export default function D9() {
  return (
    <Stage>
      <Slot area="main" outAt={sec(3)}>
        <ProblemCard num={1} title="Two Sum" difficulty="Easy" tags={["Array", "Hash Table"]} input="nums = [2,7,11,15], target = 9" output="[0,1]" at={sec(0.2)} />
      </Slot>
      <Slot area="main" at={sec(3.2)} style={{ top: 300 }}>
        <CodePanel code={code} title="solution.py" steps={[{ at: sec(3.4), line: 2 }, { at: sec(4.4), line: 3, note: "one pass" }, { at: sec(5.4), line: [4, 5], note: "complement seen → done" }]} />
      </Slot>
      <Slot area="below" at={sec(7)}>
        <Complexity time="O(n)" space="O(n)" vs={{ time: "O(n²)" }} at={sec(7)} />
      </Slot>
    </Stage>
  );
}
