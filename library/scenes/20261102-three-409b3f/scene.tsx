import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Text, Line } from "@react-three/drei";
import { theme, sec, Appear, Scene3D } from "@kit";

const NODES: Record<string, [number, number, number]> = {
  root: [0, 1.15, 0],
  left: [-1.35, -0.05, 0.15],
  right: [1.35, -0.05, -0.15],
  low: [-0.7, -1.25, 0.35],
};

function Bond({ a, b, opacity }: { a: [number, number, number]; b: [number, number, number]; opacity: number }) {
  const { mid, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { mid, quat, len };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.055, 0.055, len, 12]} />
      <meshStandardMaterial color={theme.muted} transparent opacity={opacity} roughness={0.6} />
    </mesh>
  );
}

function Ball({ p, label, color, opacity, s }: { p: [number, number, number]; label: string; color: string; opacity: number; s: number }) {
  return (
    <group position={p} scale={s}>
      <mesh>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} emissive={color} emissiveIntensity={0.55} roughness={0.25} />
      </mesh>
      <Text position={[0, -0.62, 0]} fontSize={0.28} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function Rig() {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 12], [0.01, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotY = interpolate(frame, [sec(0.6), sec(2.42)], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotX = interpolate(frame, [sec(1.12), sec(2.42)], [0, -1.32], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sight = interpolate(frame, [sec(1.12), sec(1.12) + 14], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dim = interpolate(frame, [sec(2.04), sec(2.42)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opLow = interpolate(frame, [sec(2.04), sec(2.42) + 13], [1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const topBright = interpolate(frame, [sec(2.42), sec(2.42) + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const topColor = topBright > 0.5 ? theme.accent : theme.fg;
  const lowColor = dim > 0.5 ? theme.muted : theme.fg;
  const lowPos: [number, number, number] = [
    NODES.low[0] + dim * 0.55,
    NODES.low[1] + dim * 1.7,
    NODES.low[2] + dim * -0.5,
  ];
  return (
    <group position={[0, 0.55, 0]} rotation={[rotX, rotY, 0]} scale={pop}>
      <Bond a={NODES.root} b={NODES.left} opacity={0.9} />
      <Bond a={NODES.root} b={NODES.right} opacity={0.9} />
      <Bond a={NODES.left} b={lowPos} opacity={0.9 * (1 - dim * 0.7)} />
      <Line points={[[NODES.root[0], 3.4, NODES.root[2]], NODES.root]} color={theme.accent} lineWidth={3} dashed transparent opacity={sight} />
      <Line points={[[NODES.left[0], 3.4, NODES.left[2]], NODES.left]} color={theme.accent} lineWidth={3} dashed transparent opacity={sight} />
      <Line points={[[NODES.right[0], 3.4, NODES.right[2]], NODES.right]} color={theme.accent} lineWidth={3} dashed transparent opacity={sight} />
      <Ball p={NODES.root} label="10" color={topColor} opacity={1} s={1} />
      <Ball p={NODES.left} label="5" color={topColor} opacity={1} s={0.92} />
      <Ball p={NODES.right} label="15" color={topColor} opacity={1} s={0.92} />
      <Ball p={lowPos} label="7" color={lowColor} opacity={opLow} s={0.85 * (1 - dim * 0.32)} />
    </group>
  );
}

export default function Scene() {
  useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Scene3D orbit={0} cameraZ={9}>
        <Rig />
      </Scene3D>
      <Appear at={0} outAt={sec(1.12)} style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.fg }}>See tree from above</div>
      </Appear>
      <Appear at={sec(2.04)} style={{ position: "absolute", top: 1080, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 68, color: theme.accent }}>HALF VANISHES</div>
      </Appear>
    </AbsoluteFill>
  );
}