import React from "react";
import { Arrow, Callout, IconRow, Pill, Slot, Stage, sec } from "@kit";

export const frames = [20, 150];
export default function G1() {
  return (
    <Stage title="Why HTTPS matters" kicker="networking">
      <Slot area="main" at={sec(0.3)}>
        <IconRow items={[{ name: "Laptop", label: "You" }, { name: "Lock", label: "TLS", color: "#FFD166" }, { name: "Server", label: "Bank" }]} at={sec(0.3)} stagger={10} size={120} gap={70} />
      </Slot>
      <Arrow from={[250, 1060]} to={[830, 1060]} at={sec(2)} bend={60} label="encrypted" color="#06D6A0" />
      <Callout x={540} y={640} text="nobody can read it" at={sec(3)} side="top" />
      <Slot area="below" at={sec(3.5)}>
        <div style={{ display: "flex", gap: 16 }}>
          <Pill text="AES-256" at={sec(3.6)} />
          <Pill text="RSA handshake" at={sec(3.8)} color="#F72585" />
        </div>
      </Slot>
    </Stage>
  );
}
