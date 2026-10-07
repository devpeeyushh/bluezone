"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { bootPhase } from "./worldState";

// Radio-grid ground extending beyond the facility: distance-faded grid with slow radial pulses
// travelling outward from the sector. Sits just below the room floor, so it only shows outside.

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uBoot;
varying vec3 vWorld;
float gridLine(vec2 p, float s) {
  vec2 q = p / s;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  vec2 p = vWorld.xz;
  float dist = length(p);
  float minor = gridLine(p, 2.0);
  float major = gridLine(p, 10.0);
  float fade = smoothstep(85.0, 14.0, dist) * smoothstep(8.1, 9.5, max(abs(p.x), abs(p.y)));
  float ring = fract(dist / 55.0 - uTime * 0.045);
  float pulse = smoothstep(0.0, 0.015, ring) * smoothstep(0.05, 0.015, ring);
  vec3 col = vec3(0.0, 0.42, 0.55) * (minor * 0.10 + major * 0.22)
           + vec3(0.0, 0.55, 0.75) * pulse * (0.20 + 0.05 * uLevel);
  // Wake-up: the grid powers on outward from the facility
  float boot = smoothstep(dist - 6.0, dist + 6.0, uBoot * 90.0);
  gl_FragColor = vec4(col * fade * boot, 1.0);
}
`;

export const WorldGrid: React.FC<{ level: number; motion: number }> = ({ level, motion }) => {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLevel: { value: 0 }, uBoot: { value: 0 } }), []);
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const target = useLatest({ level, motion });

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    uniforms.uTime.value += dt * target.current.motion;
    uniforms.uLevel.value = damp(uniforms.uLevel.value, target.current.level, 1.2, dt);
    uniforms.uBoot.value = bootPhase(0.1, 0.6);
  });

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} raycast={noRaycast} frustumCulled={false}>
      <planeGeometry args={[200, 200]} />
    </mesh>
  );
};
