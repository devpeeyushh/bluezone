"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { playerPresence } from "./playerPresence";
import { bootPhase } from "./worldState";

// "Advanced glass" without real reflections: one additive sheet just inside each glass surface
// (back, left, right walls and the skylight) sharing a single material. Fresnel edge glow,
// slow drifting reflection bands, a faint mirrored horizon line, an occasional signal streak and
// the player's light spilling onto nearby glass. Calmer and cleaner once the trail is complete.

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uBoot;
uniform float uCalm;
uniform vec3 uPlayer; // xz, presence
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float facing = abs(dot(normalize(vNormal), v));
  float fres = pow(1.0 - facing, 3.0);

  // Drifting reflection bands (broad, slanted, very faint)
  float bands = pow(0.5 + 0.5 * sin((vUv.x + vUv.y * 0.55) * 14.0 - uTime * 0.11), 22.0);
  // Mirrored horizon on the walls
  float horizon = exp(-pow((vWorld.y - 1.15) * 5.0, 2.0)) * step(vWorld.y, 5.5);
  // Occasional signal streak crossing the glass
  float sx = fract(uTime * 0.045 + vUv.y * 0.05);
  float streak = exp(-pow((vUv.x - sx) * 55.0, 2.0)) * exp(-pow((vUv.y - 0.63) * 70.0, 2.0)) * step(0.55, fract(uTime * 0.045 * 0.5));
  // Player light spilling onto nearby glass
  float pd = length(vWorld.xz - uPlayer.xy);
  float spill = exp(-pd * pd * 0.32) * exp(-pow(vWorld.y - 1.3, 2.0) * 0.35) * uPlayer.z;

  float a = fres * 0.06 + bands * 0.022 * (1.0 - 0.6 * uCalm) + horizon * 0.03 + streak * 0.14 * (1.0 - uCalm) + spill * 0.06;
  gl_FragColor = vec4(vec3(0.16, 0.62, 0.78) * a * uBoot, 1.0);
}
`;

// [position, rotation, size]
const SHEETS: [[number, number, number], [number, number, number], [number, number]][] = [
  [[0, 3, -5.79], [0, 0, 0], [16, 6]], // back
  [[-5.79, 3, 0], [0, Math.PI / 2, 0], [16, 6]], // left
  [[5.79, 3, 0], [0, -Math.PI / 2, 0], [16, 6]], // right
  [[0, 5.59, 0], [Math.PI / 2, 0, 0], [16, 16]], // skylight (facing down)
];

export const GlassSheen: React.FC<{ level: number; motion: number }> = ({ level, motion }) => {
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBoot: { value: 0 }, uCalm: { value: 0 }, uPlayer: { value: new THREE.Vector3() } }),
    []
  );
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const latest = useLatest({ level, motion });

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    uniforms.uTime.value += dt * latest.current.motion;
    uniforms.uBoot.value = bootPhase(0.25);
    uniforms.uCalm.value = damp(uniforms.uCalm.value, latest.current.level >= 4 ? 1 : 0, 0.8, dt);
    uniforms.uPlayer.value.set(playerPresence.x, playerPresence.z, playerPresence.active);
  });

  return (
    <group>
      {SHEETS.map(([pos, rot, size], i) => (
        <mesh key={i} material={material} position={pos} rotation={rot} raycast={noRaycast} renderOrder={2}>
          <planeGeometry args={size} />
        </mesh>
      ))}
    </group>
  );
};
