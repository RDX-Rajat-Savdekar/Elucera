import React from "react";
import { Slot, Split, Stage, Terminal, Timeline, sec } from "@kit";

export const frames = [70, 200];
export default function G4() {
  return (
    <Stage title="Brute force vs optimal" titleOutAt={sec(5)}>
      <Slot area="main" outAt={sec(5)}>
        <Split left={{ title: "Brute force", body: "check every pair · O(n²)" }} right={{ title: "Hash map", body: "one pass · O(n)" }} winner="right" at={sec(0.3)} />
      </Slot>
      <Slot area="main" at={sec(5.3)}>
        <Timeline items={[{ label: "1958 · hashing", at: sec(5.4) }, { label: "1972 · B-trees", sub: "databases", at: sec(5.7) }, { label: "2009 · Redis", at: sec(6) }]} />
      </Slot>
      <Slot area="below" at={sec(1.5)}>
        <Terminal lines={[{ text: "python two_sum.py", at: sec(1.6), kind: "cmd" }, { text: "[0, 1]", at: sec(2.6), kind: "ok" }]} />
      </Slot>
    </Stage>
  );
}
