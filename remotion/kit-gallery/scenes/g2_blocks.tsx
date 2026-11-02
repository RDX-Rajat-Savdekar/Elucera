import React from "react";
import { Headline, Mark, Progress, Slot, Stage, StepList, sec } from "@kit";

export const frames = [150];
export default function G2() {
  return (
    <Stage title="The 3-step trick">
      <Slot area="main">
        <StepList items={["Sort the array", "Walk two pointers inward", "Stop when they meet"]} at={sec(0.2)} activeAt={[sec(2), sec(3), sec(4)]} />
      </Slot>
      <Slot area="below" at={sec(1)}>
        <div style={{ fontFamily: "Arial", fontWeight: 900, fontSize: 60, color: "#F5F7FA" }}>
          only <Mark kind="circle" at={sec(2.2)} color="#FFD166">O(n)</Mark> time
        </div>
        <div style={{ marginTop: 30 }}><Progress value={0.8} at={sec(2.5)} label="faster than brute force" /></div>
      </Slot>
    </Stage>
  );
}
