import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Title, Appear, Scene3D, theme, sec, ramp } from "@kit";
import { Line, Text } from "@react-three/drei";

function TreeInner() {
  const f = useCurrentFrame();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const beam = interpolate(f, [sec(2.04), sec(2.04) + 22], [0, 1], cl);
  const rotY = interpolate(f, [sec(3.02), sec(3.02) + 28], [0.55, 0], cl);
  const mag = interpolate(f, [sec(4.08), sec(4.4), sec(4.96)], [0, 1, 0.15], cl);
  const z7 = interpolate(f, [sec(4.96), sec(5.6)], [0, -1.1], cl);
  const dim7 = interpolate(f, [sec(4.96), sec(6.44)], [1, 0.28], cl);
  const keep = ramp(f, sec(6.44), 15);
  const lift = interpolate(f, [sec(7.16), sec(7.8)], [0, 0.38], cl);
  const arrowY = interpolate(f, [sec(0.32), sec(1.0)], [4.2, 2.3], cl);
  const arrowO = interpolate(f, [sec(0.32), sec(0.45)], [0, 1], cl);
  const axis = interpolate(f, [sec(8.5), sec(8.95)], [0, 1], cl);

  const p10: [number, number, number] = [0, 0.9 + lift, 0];
  const p5: [number, number, number] = [-1.2, -0.5 + lift, 0];
  const p15: [number, number, number] = [1.2, -0.5 + lift, 0];
  const p7: [number, number, number] = [0, -0.5, z7];
  const beams = [-1.2, 0, 1.2];

  const topColor = keep > 0.5 ? theme.accent : theme.fg;
  const cenColor = mag > 0.4 ? theme.accent2 : topColor;

  return (
    <group rotation={[0, rotY, 0]}>
      {beams.map((x) => (
        <mesh key={x} position={[x, 1, 0]} scale={[1, Math.max(beam, 0.001), 1]}>
          {/* @ts-ignore */}
          <cylinderGeometry args={[0.09, 0.09, 6, 12]} />
          {/* @ts-ignore */}
          <meshStandardMaterial color={theme.accent} transparent opacity={0.28} emissive={theme.accent} emissiveIntensity={1.2} depthWrite={false} />
        </mesh>
      ))}
      {/* @ts-ignore */}
      <mesh position={[0, arrowY, 0.4]} rotation={[Math.PI, 0, 0]}>
        {/* @ts-ignore */}
        <coneGeometry args={[0.22, 0.5, 16]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color={theme.accent} transparent opacity={arrowO} emissive={theme.accent} emissiveIntensity={2} />
      </mesh>
      {/* @ts-ignore */}
      <Line points={[p10, p5]} color={theme.muted} lineWidth={4} transparent opacity={0.9} />
      {/* @ts-ignore */}
      <Line points={[p10, p15]} color={theme.muted} lineWidth={4} transparent opacity={0.9} />
      {/* @ts-ignore */}
      <Line points={[p5, p7]} color={theme.muted} lineWidth={3} transparent opacity={0.7} />
      {[
        { p: p5, l: "5", c: topColor, o: 1, h: keep },
        { p: p10, l: "10", c: cenColor, o: 1, h: Math.max(mag, keep) },
        { p: p15, l: "15", c: topColor, o: 1, h: keep },
        { p: p7, l: "7", c: mag > 0.4 ? theme.accent2 : theme.muted, o: dim7, h: mag },
      ].map((n) => (
        <group key={n.l} position={n.p}>
          {/* @ts-ignore */}
          <mesh>
            {/* @ts-ignore */}
            <sphereGeometry args={[0.34, 32, 32]} />
            {/* @ts-ignore */}
            <meshStandardMaterial color={n.c} transparent opacity={n.o} emissive={n.h > 0.3 ? n.c : "#000000"} emissiveIntensity={n.h * 2.2} roughness={0.3} />
          </mesh>
          {n.h > 0.25 && (
            // @ts-ignore
            <mesh scale={[1.45, 1.45, 1.45]}>
              {/* @ts-ignore */}
              <sphereGeometry args={[0.34, 24, 24]} />
              {/* @ts-ignore */}
              <meshStandardMaterial color={n.c} transparent opacity={0.22 * n.h} emissive={n.c} emissiveIntensity={1.5} depthWrite={false} />
            </mesh>
          )}
          {/* @ts-ignore */}
          <Text position={[0, 0, 0.55]} fontSize={0.3} color={n.o < 0.6 ? "#9AA3B2" : "#FFFFFF"} anchorX="center" anchorY="middle">{n.l}</Text>
        </group>
      ))}
      {/* @ts-ignore */}
      <mesh position={[0, -2.1, 0]}>
        {/* @ts-ignore */}
        <boxGeometry args={[3.4, 0.08, 0.08]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color={theme.muted} transparent opacity={0.35 + axis * 0.65} emissive={theme.accent} emissiveIntensity={axis * 0.8} />
      </mesh>
      {beams.map((x, i) => {
        const on = interpolate(f, [sec(8.5) + i * 5, sec(8.5) + i * 5 + 8], [0, 1], cl);
        return (
          // @ts-ignore
          <mesh key={"s" + x} position={[x, -2.1, 0]}>
            {/* @ts-ignore */}
            <sphereGeometry args={[0.14, 20, 20]} />
            {/* @ts-ignore */}
            <meshStandardMaterial color={on > 0.5 ? theme.accent : theme.muted} emissive={on > 0.5 ? theme.accent : "#000000"} emissiveIntensity={on * 2.5} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Scene() {
  const label: React.CSSProperties = { fontFamily: theme.font, fontWeight: 900, fontSize: 56, color: theme.fg, textAlign: "center", width: "100%" };
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Scene3D orbit={0} cameraZ={9}>
        <TreeInner />
      </Scene3D>
      <Title text="Top view looks down" at={0} size={92} y={220} />
      <Appear at={sec(4.08)} outAt={sec(6.3)} style={{ position: "absolute", top: 470, width: "100%" }}>
        <div style={label}>Nodes line up <span style={{ color: theme.accent2 }}>behind</span></div>
      </Appear>
      <Appear at={sec(6.44)} outAt={sec(8.4)} style={{ position: "absolute", top: 470, width: "100%" }}>
        <div style={label}>Keep only the <span style={{ color: theme.accent }}>highest</span></div>
      </Appear>
      <Appear at={sec(8.5)} style={{ position: "absolute", top: 470, width: "100%" }}>
        <div style={label}>Three <span style={{ color: theme.accent }}>sideways</span> spots</div>
      </Appear>
    </AbsoluteFill>
  );
}