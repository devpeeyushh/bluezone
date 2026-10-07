"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { DISTANT_TOWERS } from "./DistantStructures";
import { bootPhase } from "./worldState";

// Lightweight "volumetric" light in the far field: one instanced draw of camera-facing (Y-axis
// billboard) quads. Thin signal beams rise from the distant masts; a few broad, very faint light
// volumes give the sky depth. The Forensics mast's beam strengthens as the route is reconstructed
// and holds steady once the trail is complete. No real volumetrics, no extra render passes.

const vertexShader = /* glsl */ `
attribute vec4 aInfo; // kind (0 beam, 1 volume, 2 forensics beam), seed, strength, unused
varying vec2 vUv;
varying vec4 vInfo;
varying float vDist;
void main() {
  vUv = uv;
  vInfo = aInfo;
  vec3 base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sx = length(instanceMatrix[0].xyz);
  float sy = length(instanceMatrix[1].xyz);
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(0.0001))));
  vec3 wp = base + right * position.x * sx + vec3(0.0, (position.y + 0.5) * sy, 0.0);
  vDist = length(wp - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uBoot;
uniform float uForensics;
uniform float uCalm;
varying vec2 vUv;
varying vec4 vInfo;
varying float vDist;
void main() {
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float y = vUv.y;
  float kind = vInfo.x;
  float seed = vInfo.y;
  float a;
  vec3 col;
  if (kind > 0.5 && kind < 1.5) {
    // Broad light volume: soft column, fading upward, slow breathing
    a = pow(across, 1.6) * smoothstep(0.0, 0.25, y) * pow(1.0 - y, 1.4) * (0.75 + 0.25 * sin(uTime * 0.13 + seed * 6.28));
    a *= 0.08;
    col = vec3(0.12, 0.42, 0.58);
  } else {
    // Signal beam: tight core + glow; occasional transmission bursts travel up the beam
    float core = pow(across, 10.0) + pow(across, 2.0) * 0.3;
    float fade = smoothstep(0.0, 0.03, y) * pow(1.0 - y, 2.2);
    float burst = smoothstep(0.08, 0.0, abs(y - fract(uTime * 0.08 + seed))) * step(0.45, fract(uTime * 0.04 + seed * 3.1));
    float flicker = mix(0.55 + 0.45 * sin(uTime * (0.6 + seed) + seed * 9.0), 1.0, uCalm);
    a = core * fade * (flicker * 0.5 + burst * 0.9 * (1.0 - uCalm));
    if (kind > 1.5) {
      a *= 0.7 + 1.6 * uForensics;
      col = vec3(0.18, 0.82, 1.0);
    } else {
      a *= 0.9;
      col = vec3(0.1, 0.62, 0.8);
    }
  }
  // Atmospheric perspective (ShaderMaterial skips scene fog)
  a *= exp(-vDist * 0.012) * vInfo.z * uBoot;
  gl_FragColor = vec4(col * a, 1.0);
}
`;

// Broad light volumes far out on the horizon (x, z, width, height)
const VOLUMES: [number, number, number, number][] = [
  [-52, -30, 14, 70],
  [38, -60, 18, 80],
  [60, 18, 12, 60],
  [-34, 52, 14, 64],
];

export const LightShafts: React.FC<{ level: number; motion: number }> = ({ level, motion }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = DISTANT_TOWERS.length + VOLUMES.length;

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const info = new Float32Array(count * 4);
    DISTANT_TOWERS.forEach((t, i) => {
      info.set([i === 0 ? 2 : 0, (i * 0.37) % 1, 1, 0], i * 4);
    });
    VOLUMES.forEach((_, j) => {
      info.set([1, (j * 0.61) % 1, 1, 0], (DISTANT_TOWERS.length + j) * 4);
    });
    g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
    return g;
  }, [count]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBoot: { value: 0 }, uForensics: { value: 0 }, uCalm: { value: 0 } }),
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

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    DISTANT_TOWERS.forEach((t, i) => {
      // Beam rises from just below the mast tip
      m.compose(p.set(t.pos[0], t.height * 0.9, t.pos[2]), q, s.set(i === 0 ? 1.6 : 1.1, 48, 1));
      mesh.setMatrixAt(i, m);
    });
    VOLUMES.forEach(([x, z, w, h], j) => {
      m.compose(p.set(x, -2, z), q, s.set(w, h, 1));
      mesh.setMatrixAt(DISTANT_TOWERS.length + j, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  const latest = useLatest({ level, motion });
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const t = latest.current;
    uniforms.uTime.value += dt * t.motion;
    uniforms.uBoot.value = bootPhase(0.5);
    // The reconstructed Radio → Forensics route lights the Forensics mast
    uniforms.uForensics.value = damp(uniforms.uForensics.value, Math.min(1, t.level / 3), 0.8, dt);
    uniforms.uCalm.value = damp(uniforms.uCalm.value, t.level >= 4 ? 1 : 0, 0.8, dt);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      raycast={noRaycast}
      frustumCulled={false}
      renderOrder={-5}
    />
  );
};
