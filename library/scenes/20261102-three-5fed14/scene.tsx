import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, sec, Appear, Scene3D } from "@kit";

function Payoff3D() {
  const frame = useCurrentFrame();

  const glassZ = interpolate(frame, [sec(0.33), sec(1.8)], [-1.6, 1.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glassScale = interpolate(frame, [sec(0.33), sec(1.8)], [0.72, 1.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waterSpin = interpolate(frame, [sec(3.89), sec(7.8)], [0, 6.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waterBright = interpolate(frame, [sec(3.89), sec(4.4)], [0.55, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rattleAmt = interpolate(frame, [sec(5.23), sec(5.6)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rattleFade = interpolate(frame, [sec(6.6), sec(7.0)], [1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = interpolate(frame, [sec(7.03), sec(7.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseWave = (Math.sin(frame * 0.45) + 1) / 2;

  const spark: [number, number, number][] = [
    [-0.9, 0.5, 0.6],
    [0.85, 0.7, 0.5],
    [-0.7, -0.4, 0.9],
    [0.75, -0.2, 0.9],
    [0.1, 1.0, 0.4],
    [-0.2, 0.9, 0.7],
    [0.5, 0.35, 1.0],
    [-0.5, 0.2, 1.0],
  ];

  return (
    <group>
      {/* background cartridge */}
      <group position={[0, 1.55, -1.4]} scale={1}>
        {/* body */}
        <mesh>
          <cylinderGeometry args={[0.95, 0.95, 1.7, 32]} />
          <meshStandardMaterial
            color="#232D42"
            roughness={0.55}
            metalness={0.3}
            emissive="#5A0A0A"
            emissiveIntensity={pulse * (0.35 + pulseWave * 0.65)}
          />
        </mesh>
        {/* black top */}
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.98, 0.98, 0.42, 32]} />
          <meshStandardMaterial color="#0B0E16" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.32, 0]}>
          <boxGeometry args={[0.7, 0.14, 0.7]} />
          <meshStandardMaterial color="#05070C" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* darkened amber beads row */}
        {[-0.55, -0.18, 0.18, 0.55].map((x, i) => (
          <mesh key={i} position={[x, 0.55, 0.55]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#5A3A12" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}
        {/* locked metal icons inside */}
        {[
          { x: -0.5, c: "#FF7A00" },
          { x: 0, c: "#FF2EA6" },
          { x: 0.5, c: "#F5F7FA" },
        ].map((m, i) => {
          const jx = Math.sin(frame * 0.9 + i * 2.1) * 0.16 * rattleAmt * rattleFade;
          const jy = Math.cos(frame * 1.1 + i * 1.7) * 0.1 * rattleAmt * rattleFade;
          return (
            <group key={i} position={[m.x + jx, -0.15 + jy, 0.45]}>
              <mesh>
                <octahedronGeometry args={[0.24]} />
                <meshStandardMaterial color={m.c} roughness={0.3} metalness={0.7} emissive={m.c} emissiveIntensity={0.25} />
              </mesh>
            </group>
          );
        })}
        {/* lock bar across */}
        <mesh position={[0, -0.15, 0.78]}>
          <boxGeometry args={[1.7, 0.12, 0.08]} />
          <meshStandardMaterial color="#8A93A6" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.42, 0.78]}>
          <boxGeometry args={[0.32, 0.32, 0.08]} />
          <meshStandardMaterial color="#8A93A6" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* dark red pulse glow shell */}
        <mesh scale={1.06 + pulse * pulseWave * 0.05}>
          <cylinderGeometry args={[0.95, 0.95, 1.7, 32, 1, true]} />
          <meshStandardMaterial color="#FF2020" transparent opacity={pulse * (0.1 + pulseWave * 0.22)} emissive="#FF2020" emissiveIntensity={pulse * 0.8} side={2} depthWrite={false} />
        </mesh>
      </group>

      {/* foreground glass */}
      <group position={[0, -1.35, glassZ]} scale={glassScale}>
        {/* glass wall */}
        <mesh>
          <cylinderGeometry args={[1.05, 0.88, 1.9, 32, 1, true]} />
          <meshStandardMaterial color="#BFF3FF" transparent opacity={0.22} roughness={0.05} metalness={0.1} side={2} depthWrite={false} />
        </mesh>
        {/* glass bottom */}
        <mesh position={[0, -0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.88, 32]} />
          <meshStandardMaterial color="#BFF3FF" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        {/* cyan water */}
        <group rotation={[0, waterSpin, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.88, 0.76, 1.15, 32]} />
            <meshStandardMaterial color="#22D3EE" transparent opacity={0.62 + waterBright * 0.2} roughness={0.15} metalness={0.1} emissive="#06B6D4" emissiveIntensity={0.35 + waterBright * 0.45} />
          </mesh>
          {/* swirl ridge */}
          <mesh position={[0, 0.33, 0]} rotation={[0, waterSpin * 1.4, 0]}>
            <torusGeometry args={[0.55, 0.07, 12, 40]} />
            <meshStandardMaterial color="#A5F3FC" emissive="#22D3EE" emissiveIntensity={0.9} roughness={0.2} />
          </mesh>
        </group>
        {/* glints */}
        <mesh position={[-0.75, 0.3, 0.55]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.07, 0.9, 0.02]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.4} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0.78, -0.1, 0.5]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.05, 0.55, 0.02]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.1} transparent opacity={0.75} />
        </mesh>
        {/* sparkles */}
        {spark.map((p, i) => {
          const tw = (Math.sin(frame * 0.35 + i * 1.9) + 1) / 2;
          return (
            <mesh key={i} position={p} scale={0.5 + tw * 0.9}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#A5F3FC" emissiveIntensity={0.6 + tw * 1.8} transparent opacity={0.35 + tw * 0.65} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const swapPop = spring({ frame: frame - sec(2.75), fps, config: { damping: 14 } });
  const swapSlide = interpolate(frame, [sec(2.75), sec(3.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowX = interpolate(frame, [sec(2.75), sec(3.89)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowShift = Math.sin(frame * 0.4) * 18 * arrowX;

  const meterFill = interpolate(frame, [sec(0.5), sec(7.3)], [0.14, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const meterRed = interpolate(frame, [sec(7.03), sec(7.5)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowOp = interpolate(frame, [sec(3.89), sec(4.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Scene3D orbit={0.22} cameraZ={9}>
        <Payoff3D />
      </Scene3D>

      {/* top intro — fades before SWAPPED */}
      <Appear
        at={sec(0.33)}
        outAt={sec(2.75)}
        style={{ position: "absolute", top: 212, width: "100%", textAlign: "center", padding: "0 60px" }}
      >
        <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 88, color: theme.fg, lineHeight: 1.05 }}>
          Water isn&apos;t filtered.
        </div>
        <div style={{ marginTop: 14, fontFamily: theme.font, fontWeight: 800, fontSize: 50, color: theme.accent }}>
          sparkling glass forward
        </div>
      </Appear>

      {/* SWAPPED pop */}
      <Appear
        at={sec(2.75)}
        outAt={sec(3.89)}
        style={{ position: "absolute", top: 300, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 108,
            color: theme.fg,
            letterSpacing: 4,
            transform: `scale(${0.6 + swapPop * 0.4})`,
            opacity: swapPop,
          }}
        >
          SWAPPED
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center", alignItems: "center", gap: 24, opacity: swapSlide }}>
          <div
            style={{
              fontFamily: theme.mono,
              fontWeight: 900,
              fontSize: 72,
              color: theme.accent,
              transform: `translateX(${-arrowShift}px)`,
            }}
          >
            {"→"}
          </div>
          <div
            style={{
              fontFamily: theme.mono,
              fontWeight: 900,
              fontSize: 72,
              color: theme.accent2,
              transform: `translateX(${arrowShift}px)`,
            }}
          >
            {"←"}
          </div>
        </div>
        <div style={{ marginTop: 10, fontFamily: theme.font, fontWeight: 800, fontSize: 48, color: theme.fg }}>
          clean swap, not a filter
        </div>
      </Appear>

      {/* swap arrows between glass + cartridge */}
      <Appear at={sec(2.75)} outAt={sec(5.2)} style={{ position: "absolute", top: 760, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 54,
              fontWeight: 900,
              color: theme.accent,
              background: "rgba(34,211,238,0.14)",
              border: `2px solid ${theme.accent}`,
              borderRadius: 999,
              padding: "6px 26px",
              transform: `translateX(${-arrowShift * 0.6}px)`,
            }}
          >
            {"→"}
          </div>
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 54,
              fontWeight: 900,
              color: theme.accent2,
              background: "rgba(255,46,166,0.14)",
              border: `2px solid ${theme.accent2}`,
              borderRadius: 999,
              padding: "6px 26px",
              transform: `translateX(${arrowShift * 0.6}px)`,
            }}
          >
            {"←"}
          </div>
        </div>
      </Appear>

      {/* CLEAN IN */}
      <Appear
        at={sec(3.89)}
        outAt={sec(5.23)}
        style={{ position: "absolute", top: 1050, width: "100%", display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 62,
            color: "#06202A",
            background: theme.accent,
            borderRadius: 999,
            padding: "16px 54px",
            boxShadow: `0 0 ${30 + glowOp * 50}px ${theme.accent}`,
          }}
        >
          CLEAN IN
        </div>
      </Appear>

      {/* METALS OUT */}
      <Appear
        at={sec(5.23)}
        outAt={sec(7.03)}
        style={{ position: "absolute", top: 1050, width: "100%", display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 62,
            color: "#2A0618",
            background: theme.accent2,
            borderRadius: 999,
            padding: "16px 54px",
            boxShadow: `0 0 60px ${theme.accent2}`,
          }}
        >
          METALS OUT
        </div>
      </Appear>

      {/* TRAP FULL */}
      <Appear at={sec(7.03)} style={{ position: "absolute", top: 1050, width: "100%", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 900,
            fontSize: 64,
            color: theme.fg,
            background: "rgba(255,32,32,0.22)",
            border: `3px solid #FF5050`,
            borderRadius: 28,
            padding: "14px 48px",
          }}
        >
          TRAP FULL
        </div>
      </Appear>

      {/* fill meter beside cartridge */}
      <Appear at={sec(0.6)} style={{ position: "absolute", left: 880, top: 560, width: 120 }}>
        <div style={{ fontFamily: theme.mono, fontSize: 34, fontWeight: 900, color: theme.fg, textAlign: "center", marginBottom: 10 }}>
          FILL
        </div>
        <div
          style={{
            width: 56,
            height: 360,
            margin: "0 auto",
            borderRadius: 28,
            border: `3px solid ${theme.fg}`,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${meterFill * 100}%`,
              background: meterRed > 0.5 ? "#FF5050" : theme.accent,
              boxShadow: meterRed > 0.5 ? "0 0 30px #FF5050" : `0 0 30px ${theme.accent}`,
            }}
          />
        </div>
        <div style={{ marginTop: 10, fontFamily: theme.mono, fontSize: 36, fontWeight: 900, color: meterRed > 0.5 ? "#FF5050" : theme.accent, textAlign: "center" }}>
          {meterFill > 0.97 ? "100%" : `${Math.round(meterFill * 100)}%`}
        </div>
      </Appear>
    </AbsoluteFill>
  );
}