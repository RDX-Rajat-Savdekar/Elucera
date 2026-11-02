import React from "react";
import { HashMapView, SeqView, Slot, Stage, sec } from "@kit";

export const frames = [120, 200];
export default function D5() {
  return (
    <Stage title="Stack · queue · map">
      <Slot area="main" style={{ flexDirection: "row", gap: 60, alignItems: "center" }}>
        <SeqView kind="stack" label="stack" steps={[{ at: sec(0.3), items: ["("] }, { at: sec(1.2), items: ["(", "["] }, { at: sec(2.4), items: ["("] , mark: {} }, { at: sec(3.4), items: ["(", "{"], mark: { 1: "active" } }]} maxItems={5} />
        <HashMapView label="count" width={460} steps={[{ at: sec(0.5), entries: [["a", 1]] }, { at: sec(1.5), entries: [["a", 1], ["b", 1]] }, { at: sec(2.5), entries: [["a", 2], ["b", 1]], active: "a", op: "a += 1" }]} />
      </Slot>
      <Slot area="below">
        <SeqView kind="queue" label="queue" steps={[{ at: sec(0.3), items: [1, 2, 3] }, { at: sec(2), items: [2, 3, 4] }, { at: sec(3.5), items: [3, 4, 5, 6] }]} maxItems={6} />
      </Slot>
    </Stage>
  );
}
