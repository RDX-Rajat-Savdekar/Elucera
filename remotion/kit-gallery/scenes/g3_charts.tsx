import React from "react";
import { BarChart, Counter, Slot, Stage, sec } from "@kit";

export const frames = [150];
export default function G3() {
  return (
    <Stage title="Lookups per second">
      <Slot area="main">
        <BarChart data={[{ label: "Array scan", value: 12 }, { label: "Binary search", value: 48 }, { label: "Hash map", value: 95 }]} highlight={2} unit="M" at={sec(0.4)} />
      </Slot>
      <Slot area="below" at={sec(2)}>
        <Counter to={95} suffix="M/s" at={sec(2)} size={120} label="hash map" />
      </Slot>
    </Stage>
  );
}
