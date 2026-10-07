"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, noRaycast, useLatest, useShaderMaterial } from "../scene/environment/envUtils";
import { entryState } from "./entryState";

// Landing focal point: a transmission column rising from the facility skylight, with slow rings
// expanding over the roof. Quiet at rest; strengthens while ENTER FACILITY is hovered and flares
// on entry. Two meshes, one shared time base, no per-frame allocation.

const columnVertex = /* glsl */ `
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  // Y-axis billboard around the column base
  vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(0.0001))));
  float sx = length(modelMatrix[0].xyz);
  float sy = length(modelMatrix[1].xyz);
  vec3 wp = base + right * position.x * sx + vec3(0.0, (position.y + 0.5) * sy, 0.0);
  vDist = length(wp - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const columnFragment = /* glsl */ `
uniform float uTime;
uniform float uPower;
varying vec2 vUv;
void main() {
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float y = vUv.y;
  float core = pow(across, 12.0) * 1.2 + pow(across, 2.5) * 0.25;
  float fade = smoothstep(0.0, 0.02, y) * pow(1.0 - y, 1.6);
  // Data pulses climbing the column
  float pulses = smoothstep(0.06, 0.0, abs(fract(y * 3.0 - uTime * 0.35) - 0.5) - 0.44);
  float a = (core * (0.55 + 0.45 * uPower) + pulses * core * 0.8 * uPower) * fade;
  gl_FragColor = vec4(vec3(0.2, 0.82, 1.0) * a * (0.45 + 0.75 * uPower), 1.0);
}
`;

const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uPower;
varying vec2 vUv;
void main() {
  vec2 c = (vUv - 0.5) * 2.0;
  float r = length(c);
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = fract(uTime * 0.12 + float(i) / 3.0);
    a += smoothstep(0.02, 0.0, abs(r - ph)) * (1.0 - ph) * (1.0 - ph);
  }
  a *= smoothstep(1.0, 0.85, r) * (0.25 + 0.75 * uPower);
  gl_FragColor = vec4(vec3(0.15, 0.7, 0.95) * a * 0.6, 1.0);
}
`;

const ringVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const EntryBeacon: React.FC<{ motion: number }> = ({ motion }) => {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPower: { value: 0 } }), []);
  const column = useShaderMaterial(() => ({
    uniforms,
    vertexShader: columnVertex,
    fragmentShader: columnFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const rings = useShaderMaterial(() => ({
    uniforms,
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const latest = useLatest(motion);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const target = entryState.entering ? 1.6 : 0.35 + entryState.hover * 0.45;
    uniforms.uPower.value = damp(uniforms.uPower.value, target, entryState.entering ? 4 : 3, dt);
    uniforms.uTime.value += dt * latest.current * (1 + uniforms.uPower.value * 0.6);
  });

  return (
    <group position={[0, 6.0, -0.5]}>
      <mesh material={column} scale={[1.4, 60, 1]} raycast={noRaycast} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh material={rings} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} raycast={noRaycast}>
        <planeGeometry args={[18, 18]} />
      </mesh>
    </group>
  );
};
