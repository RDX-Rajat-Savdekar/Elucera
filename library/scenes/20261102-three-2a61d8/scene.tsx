import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme, sec, ramp, Appear, Title, Scene3D } from "@kit";
import { Line } from "@react-three/drei";

const label: React.CSSProperties = {
  fontFamily: theme.font,
  fontWeight: 900,
  textAlign: "center",
  color: theme.fg,
};

function Rig() {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [sec(0.37), sec(6.43)], [-1.25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, [sec(0.37), sec(6.43)], [1.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanY = interpolate(frame, [sec(0.37), sec(1.8)], [3.2, -2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanOp = interpolate(frame, [sec(0.37), sec(0.6), sec(1.6), sec(1.93)], [0, 0.5, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dim = interpolate(frame, [sec(4.91), sec(5.6)], [1, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hide7 = interpolate(frame, [sec(4.91), sec(5.4)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const treeX = [-1.5, -0.5, 0.5];
  const rowX = [-1.6, 0, 1.6];
  return (
    <group rotation={[tilt, 0, 0]} scale={[zoom, zoom, zoom]} position={[0, -0.3, 0]}>
      <mesh position={[0, scanY, 0.6]}>
        <boxGeometry args={[4.6, 0.08, 3]} />
        <meshBasicMaterial color={theme.accent} transparent opacity={scanOp} />
      </mesh>
      <Line points={[[0, 2.2, 0], [-1, 1.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      <Line points={[[0, 2.2, 0], [1, 1.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      <Line points={[[-1, 1.2, 0], [-1.5, 0.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      <Line points={[[-1, 1.2, 0], [-0.5, 0.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      <Line points={[[1, 1.2, 0], [0.5, 0.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      <Line points={[[1, 1.2, 0], [1.5, 0.2, 0]]} color={theme.muted} lineWidth={3} transparent opacity={dim} />
      {[
        { x: 0, y: 2.2 },
        { x: -1, y: 1.2 },
        { x: 1, y: 1.2 },
        { x: 1.5, y: 0.2, hide: true },
      ].map((n, i) => (
        <mesh key={i} position={[n.x, n.y, 0]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={theme.muted} transparent opacity={n.hide ? hide7 * dim : dim} />
        </mesh>
      ))}
      <mesh position={[0, -1.05, 2.2]}>
        <boxGeometry args={[3.6, 0.06, 0.06]} />
        <meshBasicMaterial color={theme.muted} transparent opacity={0.9} />
      </mesh>
      {treeX.map((tx, i) => {
        const p = ramp(frame, sec(1.93) + i * 8, 18);
        const x = interpolate(p, [0, 1], [tx, rowX[i]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = interpolate(p, [0, 1], [0.2, -0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const z = interpolate(p, [0, 1], [0, 2.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pop = interpolate(frame, [sec(1.93) + i * 8, sec(1.93) + i * 8 + 9], [0.4, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const pulse = interpolate(
          frame,
          [sec(3.43) + i * 6, sec(3.43) + i * 6 + 6, sec(3.43) + i * 6 + 12],
          [1, 1.45, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const isCyan = frame >= sec(1.93) + i * 8 + 9;
        const isGreen = frame >= sec(3.43) + i * 6 && frame < sec(4.91);
        return (
          <mesh key={i} position={[x, y, z]} scale={[pop * pulse, pop * pulse, pop * pulse]}>
            <sphereGeometry args={[0.32, 32, 32]} />
            <meshStandardMaterial color={isGreen ? theme.good : isCyan ? theme.accent : theme.muted} emissive={isGreen ? theme.good : isCyan ? theme.accent : "#000000"} emissiveIntensity={isCyan ? 0.7 : 0} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Scene() {
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Scene3D orbit={0} cameraZ={9}>
        <Rig />
      </Scene3D>
      <Title text="One pass top to bottom" at={0} size={88} y={220} />
      <Appear at={sec(1.93)} outAt={sec(3.43)} style={{ position: "absolute", top: 220, width: "100%" }}>
        <div style={{ ...label, fontSize: 88 }}>First seen wins</div>
      </Appear>
      <Appear at={sec(3.43)} outAt={sec(4.91)} style={{ position: "absolute", top: 220, width: "100%" }}>
        <div style={{ ...label, fontSize: 88 }}>
          Time is <span style={{ color: theme.accent3 }}>linear</span>
        </div>
      </Appear>
      <Appear at={sec(4.91)} style={{ position: "absolute", top: 220, width: "100%" }}>
        <div style={{ ...label, fontSize: 88 }}>Half vanishes above</div>
      </Appear>
      <Appear at={sec(3.43)} outAt={sec(4.91)} style={{ position: "absolute", top: 640, width: "100%", alignItems: "center" }}>
        <div style={{ margin: "0 auto", width: 340, textAlign: "center", background: theme.accent3, color: "#111111", fontFamily: theme.mono, fontWeight: 900, fontSize: 72, borderRadius: 28, padding: "10px 0" }}>
          O(N)
        </div>
      </Appear>
      {[0, 1, 2].map((i) => (
        <Appear key={i} at={sec(1.93) + i * 8} style={{ position: "absolute", top: 1120, left: 140 + i * 320, width: 140 }}>
          <div style={{ ...label, fontSize: 56, color: theme.accent }}>{["5", "10", "15"][i]}</div>
        </Appear>
      ))}
    </AbsoluteFill>
  );
}