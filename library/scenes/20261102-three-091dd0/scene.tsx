import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, random } from "remotion";
import { theme, sec, Appear, Scene3D } from "@kit";
import * as THREE from "three";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fFive = sec(0.71);
  const fChlor = sec(3.45);
  const fBlack = sec(8.49);
  const fStick = sec(14.87);
  const fTaste = sec(17.39);
  const fResin = sec(19.85);
  const fTrade = sec(25.97);
  const fHydro = sec(29.61);
  void fps;

  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // camera dolly simulated by moving cartridge group Y
  const dollyY = interpolate(frame, [0, fBlack, fResin, sec(21.5)], [0, -0.4, -0.4, 0.55], clamp);
  const rotY = frame * 0.012;

  const carbonGlow = interpolate(frame, [fBlack, sec(9.6)], [0, 1], clamp);
  const poreGrow = interpolate(frame, [fBlack, sec(11.0)], [0, 1], clamp);
  const resinGlow = interpolate(frame, [fResin, sec(20.9)], [0, 1], clamp);

  // chlorine pulse at 3.45s
  const chlorPulse = interpolate(frame, [fChlor, fChlor + 12, fChlor + 26], [1, 1.85, 1], clamp);
  const greenDim = interpolate(frame, [fStick, fStick + 15], [1, 0.35], clamp);

  // green dots stick at carbon
  const greenY = interpolate(frame, [fFive, fStick], [2.45, 0.85], clamp);
  // metals fall to beads
  const copperY = interpolate(frame, [fFive, fTrade], [2.45, -0.65], clamp);
  const leadY = interpolate(frame, [fFive, fTrade], [2.45, -0.95], clamp);
  const calcY = interpolate(frame, [fFive, fTrade], [2.45, -1.2], clamp);

  const tradeMix = interpolate(frame, [fTrade, fTrade + 20], [0, 1], clamp);
  const copperX = interpolate(tradeMix, [0, 1], [0.15, 0.42], clamp);
  const leadX = interpolate(tradeMix, [0, 1], [0.42, 0.15], clamp);
  const flash = interpolate(frame, [fTrade, fTrade + 5, fTrade + 20], [0, 1, 0], clamp);

  const dotOpacity = interpolate(frame, [fFive, fFive + 10], [0, 1], clamp);
  const hydroOp = interpolate(frame, [fHydro, fHydro + 10], [0, 1], clamp);
  const streamOp = interpolate(frame, [fHydro, fHydro + 12], [0, 0.35], clamp);

  const waveOp = interpolate(frame, [fStick, fTaste, fTaste + 15], [0, 1, 0], clamp);
  const waveY = interpolate(frame, [fTaste, fTaste + 15], [0, -40], clamp);

  // resin beads deterministic
  const beads: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = random(`ba-${i}`) * Math.PI * 2;
    const r = 0.25 + random(`br-${i}`) * 0.72;
    const y = -1.5 + random(`by-${i}`) * 1.15;
    beads.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, s: 0.82 + random(`bs-${i}`) * 0.36 });
  }
  // carbon pores on surface
  const pores: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 20; i++) {
    const a = random(`pa-${i}`) * Math.PI * 2;
    const y = 0.25 + random(`py-${i}`) * 1.25;
    pores.push({ x: Math.cos(a) * 1.16, y, z: Math.sin(a) * 1.16 });
  }

  const wob = Math.sin(frame * 0.12) * 0.04;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Scene3D orbit={0} cameraZ={9}>
        <pointLight position={[-4, 3, 5]} color={theme.accent} intensity={28} />
        <pointLight position={[4, -2, 4]} color={theme.accent2} intensity={12} />
        <group position={[0, dollyY, 0]} rotation={[0, rotY, 0]}>
          {/* outer cutaway shell */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[1.4, 1.4, 3.6, 32, 1, true, 0, Math.PI * 1.6]} />
            <meshStandardMaterial color="#7C8DA6" transparent opacity={0.16} side={THREE.DoubleSide} roughness={0.3} />
          </mesh>
          {/* top inlet */}
          <mesh position={[0, 1.95, 0]}>
            <cylinderGeometry args={[0.45, 0.55, 0.5, 24]} />
            <meshStandardMaterial color="#2A3648" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.72, 0]}>
            <torusGeometry args={[1.38, 0.08, 12, 40]} />
            <meshStandardMaterial color="#3A4A62" roughness={0.4} />
          </mesh>
          {/* carbon block top half */}
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[1.15, 1.15, 1.5, 32]} />
            <meshStandardMaterial
              color="#0B0E15"
              roughness={0.95}
              emissive="#0E3A4A"
              emissiveIntensity={0.1 + carbonGlow * 1.1}
            />
          </mesh>
          {pores.map((p, i) => (
            <mesh key={`p${i}`} position={[p.x, p.y, p.z]} scale={0.55 + poreGrow * 0.9}>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial color="#232D3D" roughness={1} emissive="#123A4A" emissiveIntensity={carbonGlow * 0.9} />
            </mesh>
          ))}
          {/* middle divider mesh */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[1.32, 1.32, 0.08, 32]} />
            <meshStandardMaterial color="#3B4B63" roughness={0.6} />
          </mesh>
          {/* resin beads bottom half */}
          {beads.map((b, i) => (
            <mesh key={`b${i}`} position={[b.x, b.y, b.z]} scale={b.s + resinGlow * 0.28}>
              <sphereGeometry args={[0.27, 18, 18]} />
              <meshStandardMaterial
                color="#FF9E2C"
                transparent
                opacity={0.92}
                roughness={0.25}
                emissive="#FF6A00"
                emissiveIntensity={0.25 + resinGlow * 1.6}
              />
            </mesh>
          ))}
          {/* bottom outlet */}
          <mesh position={[0, -1.92, 0]}>
            <cylinderGeometry args={[0.55, 0.4, 0.4, 24]} />
            <meshStandardMaterial color="#2A3648" roughness={0.5} />
          </mesh>
          {/* clean stream */}
          <mesh position={[0, -2.1, 0]}>
            <cylinderGeometry args={[0.32, 0.42, 1.2, 20, 1, true]} />
            <meshStandardMaterial color={theme.accent} transparent opacity={streamOp} side={THREE.DoubleSide} emissive={theme.accent} emissiveIntensity={0.8} />
          </mesh>

          {/* FIVE DOTS */}
          {/* green chlorine x2 */}
          <group position={[-0.45, greenY + wob, 0.2]}>
            <mesh scale={chlorPulse}>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color={theme.good} emissive={theme.good} emissiveIntensity={2.4} transparent opacity={greenDim * dotOpacity} />
            </mesh>
            <mesh scale={chlorPulse * 1.7}>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial color={theme.good} transparent opacity={0.22 * greenDim * dotOpacity} emissive={theme.good} emissiveIntensity={1} />
            </mesh>
          </group>
          <group position={[-0.15, greenY - 0.12 - wob, -0.2]}>
            <mesh scale={chlorPulse * 0.95}>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color={theme.good} emissive={theme.good} emissiveIntensity={2.4} transparent opacity={greenDim * dotOpacity} />
            </mesh>
            <mesh scale={chlorPulse * 1.6}>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial color={theme.good} transparent opacity={0.22 * greenDim * dotOpacity} emissive={theme.good} emissiveIntensity={1} />
            </mesh>
          </group>
          {/* copper orange */}
          <group position={[copperX, copperY, 0.2]}>
            <mesh>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color="#FF7A1A" emissive="#FF7A1A" emissiveIntensity={2.4} transparent opacity={dotOpacity} />
            </mesh>
            <mesh scale={1.1 + flash * 0.9}>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={flash * 0.9} emissive="#FFFFFF" emissiveIntensity={2} />
            </mesh>
          </group>
          {/* lead magenta */}
          <group position={[leadX, leadY, -0.15]}>
            <mesh>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color={theme.accent2} emissive={theme.accent2} emissiveIntensity={2.4} transparent opacity={dotOpacity} />
            </mesh>
            <mesh scale={1.1 + flash * 0.9}>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={flash * 0.9} emissive="#FFFFFF" emissiveIntensity={2} />
            </mesh>
          </group>
          {/* calcium white */}
          <group position={[0.05, calcY, 0.05]}>
            <mesh>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color={theme.fg} emissive={theme.fg} emissiveIntensity={1.8} transparent opacity={dotOpacity} />
            </mesh>
            <mesh scale={1.1 + flash * 0.9}>
              <sphereGeometry args={[0.19, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={flash * 0.85} emissive="#FFFFFF" emissiveIntensity={2} />
            </mesh>
          </group>

          {/* hydrogen out */}
          {[0, 1, 2, 3].map((k) => {
            const hx = -0.3 + k * 0.2;
            const hy = interpolate(frame, [fHydro, 938], [-0.75 - k * 0.08, -2.05], clamp);
            return (
              <mesh key={`h${k}`} position={[hx, hy, 0.1]}>
                <sphereGeometry args={[0.11, 14, 14]} />
                <meshStandardMaterial color={theme.fg} emissive={theme.fg} emissiveIntensity={2} transparent opacity={hydroOp} />
              </mesh>
            );
          })}
        </group>
      </Scene3D>

      {/* PHASE A */}
      <Appear at={sec(0.3)} outAt={fBlack - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg }}>FIVE INTRUDERS</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 50, color: theme.fg, marginTop: 10 }}>
          2 chlorine {"->"} copper {"->"} lead
        </div>
      </Appear>
      <Appear at={fChlor} outAt={fBlack - 15} style={{ position: "absolute", top: 430, width: "100%", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 52,
            color: theme.good,
            background: "rgba(0,0,0,0.55)",
            padding: "10px 28px",
            borderRadius: 20,
          }}
        >
          2 GREEN = CHLORINE
        </div>
      </Appear>

      {/* PHASE B carbon */}
      <Appear at={fBlack} outAt={fStick - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.fg }}>BLACK CARBON SPONGE</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 52, color: theme.accent, marginTop: 10 }}>tiny pores open wide</div>
      </Appear>

      {/* PHASE C stuck */}
      <Appear at={fStick} outAt={fTaste - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg }}>CHLORINE STICKS</div>
        <div
          style={{
            display: "inline-block",
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 52,
            color: theme.good,
            background: "rgba(0,0,0,0.6)",
            padding: "10px 30px",
            borderRadius: 20,
            marginTop: 14,
          }}
        >
          {"LOCKED  •  TRAPPED"}
        </div>
      </Appear>

      {/* taste wave dissolving */}
      <div
        style={{
          position: "absolute",
          top: 540 + waveY,
          width: "100%",
          textAlign: "center",
          opacity: waveOp,
          fontFamily: theme.font,
          fontWeight: 900,
          fontSize: 78,
          color: theme.good,
          letterSpacing: 12,
        }}
      >
        ≈ ≈ ≈
      </div>
      <Appear at={fTaste} outAt={fResin - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 96, color: theme.fg }}>TASTE VANISHES</div>
      </Appear>

      {/* PHASE resin */}
      <Appear at={fResin} outAt={fTrade - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 92, color: theme.fg }}>RESIN BEADS GLOW</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 52, color: theme.accent3, marginTop: 10 }}>loaded with hydrogen</div>
      </Appear>

      {/* PHASE trade */}
      <Appear at={fTrade} outAt={fHydro - 15} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 98, color: theme.fg }}>TRADE PLACES</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 52, color: theme.accent2, marginTop: 10 }}>bad metals stick</div>
      </Appear>

      {/* PHASE hydrogen */}
      <Appear at={fHydro} style={{ position: "absolute", top: 200, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 84, color: theme.fg }}>HYDROGEN FLOATS OUT</div>
        <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 52, color: theme.accent, marginTop: 10 }}>clean water flows</div>
      </Appear>
    </AbsoluteFill>
  );
}