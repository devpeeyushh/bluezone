"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_NOISE, damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { bootPhase, lookAt } from "./worldState";

// LAYER A — atmospheric field: a procedural sky dome (navy → teal horizon) with drifting haze,
// slow scanning bands and a faint red tint that grows as the broadcast system destabilises.
// Values are written in display space (ShaderMaterial skips tone mapping / colour conversion).

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uAlert;
uniform float uConverge;
uniform float uBoot;
varying vec3 vDir;
${GLSL_NOISE}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 zenith = vec3(0.017, 0.044, 0.092);
  vec3 horizon = vec3(0.046, 0.150, 0.230);
  vec3 below = vec3(0.006, 0.016, 0.034);
  vec3 col = h > 0.0
    ? mix(horizon, zenith, smoothstep(0.0, 0.55, h))
    : mix(horizon * 0.55, below, smoothstep(0.0, -0.35, h));

  // Low-frequency drifting haze
  float haze = fbm(d * 2.6 + vec3(uTime * 0.012, uTime * 0.004, -uTime * 0.008));
  col *= 0.78 + 0.5 * haze;
  float wisp = smoothstep(0.55, 0.85, fbm(d * 5.0 + vec3(-uTime * 0.02, 0.0, uTime * 0.015)));
  col += vec3(0.0, 0.10, 0.14) * wisp * 0.22 * (1.0 - abs(h));

  // Horizon glow (strengthens slightly as the investigation progresses)
  float glow = exp(-abs(h - 0.02) * 9.0);
  col += vec3(0.02, 0.17, 0.24) * glow * (0.6 + 0.08 * uLevel + 0.45 * uConverge);

  // Signal band arcing across the sky (seen through the skylight); clearer as the network syncs
  vec3 bandN = normalize(vec3(0.28, 0.32, 1.0));
  float gc = dot(d, bandN);
  float flow = 0.35 + 0.65 * fbm(d * 4.5 + vec3(uTime * 0.025, 0.0, -uTime * 0.012));
  float arc = exp(-gc * gc * 70.0) * flow * smoothstep(0.04, 0.45, h);
  col += vec3(0.02, 0.15, 0.2) * arc * (0.3 + 0.08 * uLevel);

  // Slow horizontal scanning bands
  float band = pow(0.5 + 0.5 * sin(h * 26.0 - uTime * 0.35), 40.0);
  col += vec3(0.0, 0.16, 0.22) * band * 0.10 * smoothstep(-0.1, 0.4, h);

  // Emergency instability near the horizon
  float pulse = 0.6 + 0.4 * sin(uTime * 1.7);
  col += vec3(0.20, 0.015, 0.035) * uAlert * glow * pulse * 0.55;

  // Facility wake-up: the sky is never a flat void, but it brightens as systems come online
  gl_FragColor = vec4(col * mix(0.4, 1.0, uBoot), 1.0);
}
`;

interface Props {
  level: number;
  converging: boolean;
  motion: number;
}

export const AtmosphericField: React.FC<Props> = ({ level, converging, motion }) => {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uAlert: { value: 0 },
      uConverge: { value: 0 },
      uBoot: { value: 0 },
    }),
    []
  );
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  const target = useLatest({ level, converging, motion });

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const t = target.current;
    uniforms.uTime.value += dt * t.motion;
    uniforms.uLevel.value = damp(uniforms.uLevel.value, t.level, 1.2, dt);
    // The broadcast relay becomes unstable once all three challenges are solved, calms on completion
    // Looking toward the relay strengthens its warning atmosphere (visual only)
    const relayLook = t.level < 4 ? lookAt("emergency-broadcast") * (t.level === 3 ? 0.35 : 0.15) : 0;
    uniforms.uAlert.value = damp(uniforms.uAlert.value, (t.level === 3 ? 1 : t.level === 2 ? 0.25 : 0) + relayLook, 1.0, dt);
    uniforms.uBoot.value = bootPhase(0);
    uniforms.uConverge.value = damp(uniforms.uConverge.value, t.converging ? 1 : t.level === 4 ? 0.35 : 0, 1.5, dt);
  });

  return (
    <>
      <color attach="background" args={["#030914"]} />
      {/* Atmospheric perspective: distant structures fade into the horizon colour */}
      <fogExp2 attach="fog" args={["#0a2236", 0.016]} />
      <mesh material={material} raycast={noRaycast} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[110, 48, 24]} />
      </mesh>
    </>
  );
};
