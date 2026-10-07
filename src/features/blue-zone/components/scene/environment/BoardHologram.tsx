"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { UV_VERTEX, damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { presenceNearness } from "./playerPresence";
import { BOARD_LOOK_ID, lookAt } from "./worldState";

// Holographic overlay on the Investigation Board screen: scanlines, a sweeping scan and drifting
// data fragments that grow denser as evidence is reconstructed. Purely visual (no raycast).
// Evidence nodes: one per reconstructed piece (count only — no content), drawn only once solved,
// so nothing is shown earlier than the board itself shows it. A second, nearly empty layer in
// front of the screen gives the projection depth (parallax as the player moves).

// World position of the board (InvestigationBoardMesh default mount)
const BOARD_X = 0;
const BOARD_Z = -5.75;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uFocus;
uniform float uNear;
uniform float uPulse;
uniform float uSolved; // integer count of reconstructed evidence (0..4)
uniform float uLook;   // looking toward the board: the (already revealed) evidence network stands out
varying vec2 vUv;
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vec2 uv = vUv;
  float activity = 1.0 + uNear * 0.6;
  float scan = smoothstep(0.012, 0.0, abs(uv.y - fract(uTime * 0.12 * activity))) * 0.5;
  float lines = (0.5 + 0.5 * sin(uv.y * 300.0)) * 0.05;
  vec2 g = uv * vec2(16.0, 8.0);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float density = 0.9 - uProgress * 0.05;
  float on = step(density, hash1(id.x + id.y * 31.0 + floor(uTime * 0.6 + hash1(id.y) * 3.0)));
  float frag = on * step(0.15, f.x) * step(f.x, 0.85) * step(0.38, f.y) * step(f.y, 0.62);
  float edge = max(smoothstep(0.01, 0.0, uv.x) + smoothstep(0.99, 1.0, uv.x),
                   smoothstep(0.02, 0.0, uv.y) + smoothstep(0.98, 1.0, uv.y));

  // Reconstructed evidence nodes along the lower band, linked once there are two or more
  vec2 q = uv * vec2(3.95, 2.15);
  float nodes = 0.0;
  float links = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= uSolved) break;
    vec2 c = vec2(0.75 + fi * 0.82, 0.42 + 0.05 * sin(uTime * 0.6 + fi * 1.7));
    float d = length(q - c);
    nodes += smoothstep(0.05, 0.0, d) + smoothstep(0.13, 0.1, d) * smoothstep(0.09, 0.1, d) * 0.6;
    if (fi > 0.0) {
      vec2 a = vec2(0.75 + (fi - 1.0) * 0.82, 0.42 + 0.05 * sin(uTime * 0.6 + (fi - 1.0) * 1.7));
      vec2 ab = c - a;
      float h = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
      float ld = length(q - a - ab * h);
      float flow = 0.5 + 0.5 * sin(h * 18.0 - uTime * 2.0);
      links += smoothstep(0.008, 0.0, ld) * (0.35 + 0.4 * flow) * step(0.12, h) * step(h, 0.88);
    }
  }

  // Progress pulse: a bright band expanding from the centre, then everything settles
  float pr = abs(uv.x - 0.5) * 2.0;
  float pulseBand = smoothstep(0.08, 0.0, abs(pr - (1.0 - uPulse))) * uPulse;

  // Fragments thin out up close so the board never reads as a wall of blocks
  float a = scan + lines + frag * (0.3 + 0.1 * uProgress) * (1.0 - 0.55 * uNear) + edge * 0.35 + uPulse * 0.12;
  a *= 0.45 + 0.2 * uFocus;
  a += (nodes * 0.9 + links) * (0.55 + 0.25 * uFocus + 0.3 * uLook) + pulseBand * 0.5;
  gl_FragColor = vec4(vec3(0.1, 0.78, 1.0) * a, 1.0);
}
`;

const depthFragment = /* glsl */ `
uniform float uTime;
uniform float uFocus;
uniform float uNear;
uniform float uPulse;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  // Corner brackets floating in front of the screen
  vec2 e = min(uv, 1.0 - uv);
  float corner = step(e.x, 0.006) * step(e.y, 0.08) + step(e.y, 0.012) * step(e.x, 0.045);
  // Slow vertical scan on the front layer, offset from the one on the screen
  float scan = smoothstep(0.004, 0.0, abs(uv.x - fract(uTime * 0.05 + 0.3))) * 0.35;
  float a = corner * (0.35 + 0.35 * uFocus + 0.2 * uNear) + scan * (0.3 + 0.7 * uNear) + uPulse * corner * 0.5;
  gl_FragColor = vec4(vec3(0.15, 0.85, 1.0) * a, 1.0);
}
`;

export const BoardHologram: React.FC<{ progress: number; focused: boolean }> = ({ progress, focused }) => {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uFocus: { value: 0 },
      uNear: { value: 0 },
      uPulse: { value: 0 },
      uSolved: { value: progress },
      uLook: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const depthUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFocus: { value: 0 }, uNear: { value: 0 }, uPulse: { value: 0 } }),
    []
  );
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader: UV_VERTEX,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const depthMaterial = useShaderMaterial(() => ({
    uniforms: depthUniforms,
    vertexShader: UV_VERTEX,
    fragmentShader: depthFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const latest = useLatest({ progress, focused });

  // Each newly reconstructed piece of evidence sends one pulse across the board
  const pulse = useRef(0);
  const prevProgress = useRef(progress);
  useEffect(() => {
    if (progress > prevProgress.current) pulse.current = 1;
    prevProgress.current = progress;
    uniforms.uSolved.value = progress;
  }, [progress, uniforms]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const near = damp(uniforms.uNear.value, presenceNearness(BOARD_X, BOARD_Z, 2.0, 6.0), 2.5, dt);
    pulse.current = Math.max(0, pulse.current - dt / 1.8);
    uniforms.uTime.value += dt;
    uniforms.uProgress.value = damp(uniforms.uProgress.value, latest.current.progress, 1.2, dt);
    uniforms.uFocus.value = damp(uniforms.uFocus.value, latest.current.focused ? 1 : 0, 5, dt);
    uniforms.uNear.value = near;
    uniforms.uPulse.value = pulse.current;
    uniforms.uLook.value = lookAt(BOARD_LOOK_ID);
    depthUniforms.uTime.value = uniforms.uTime.value;
    depthUniforms.uFocus.value = uniforms.uFocus.value;
    depthUniforms.uNear.value = near;
    depthUniforms.uPulse.value = pulse.current;
  });

  return (
    <group>
      <mesh material={material} position={[0, 0, 0.095]} raycast={noRaycast}>
        <planeGeometry args={[3.95, 2.15]} />
      </mesh>
      <mesh material={depthMaterial} position={[0, 0, 0.32]} raycast={noRaycast}>
        <planeGeometry args={[4.15, 2.3]} />
      </mesh>
    </group>
  );
};
