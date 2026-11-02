import React from "react";
import { ComplexityChart, Intervals, RecursionTree, Slot, Stage, sec } from "@kit";

export const frames = [100, 230, 330];
export default function D10() {
  const fib = { label: "f(4)", children: [{ label: "f(3)", children: [{ label: "f(2)", children: [{ label: "f(1)" }, { label: "f(0)" }] }, { label: "f(1)" }] }, { label: "f(2)", children: [{ label: "f(1)" }, { label: "f(0)" }] }] };
  return (
    <Stage title="More patterns" titleOutAt={sec(9)}>
      <Slot area="main" outAt={sec(3.8)}>
        <Intervals intervals={[[1, 3], [2, 6], [8, 10], [15, 18]]} steps={[{ at: sec(0.3), mark: { 0: "compare", 1: "compare" }, sweep: 2 }, { at: sec(1.5), mark: { 0: "done", 1: "done" }, merged: [[1, 6]], sweep: 6 }, { at: sec(2.7), mark: { 0: "done", 1: "done", 2: "done", 3: "done" }, merged: [[1, 6], [8, 10], [15, 18]], sweep: null, note: "3 merged intervals" }]} />
      </Slot>
      <Slot area="main" at={sec(4)} outAt={sec(8.5)}>
        <RecursionTree root={fib} steps={[{ at: sec(4.2), hidden: ["0.1", "0.1.0", "0.1.1", "0.0.1"] }, { at: sec(5.5), hidden: ["0.1.0", "0.1.1"], mark: { "0.1": "visited" }, badge: { "0.0": "2", "0.1": "memo" } }, { at: sec(6.7), mark: { "0.1": "visited", "0": "found" }, badge: { "0": "3" }, note: "memo hit skips f(2)" }]} />
      </Slot>
      <Slot area="main" at={sec(8.8)}>
        <ComplexityChart highlight="O(n log n)" at={sec(9)} />
      </Slot>
    </Stage>
  );
}
