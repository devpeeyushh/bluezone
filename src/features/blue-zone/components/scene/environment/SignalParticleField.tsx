"use client";

import React, { useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { damp, mulberry32, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { playerPresence } from "./playerPresence";
import { bootPhase } from "./worldState";

// LAYER B — atmospheric particles: slow room dust inside the facility plus a wider field of
// radio noise / data fragments outside. Positions are generated once; all motion happens in the
// vertex shader from a single time uniform (no per-particle JS or React work).
// Dust near the player drifts aside and catches a little more light (uPlayer, GPU only).

const ROOM_DUST = 180;
const OUTER_FIELD = 460;

const vertexShader = /* glsl */ `
attribute float aSeed;
attribute float aKind;
uniform float uTime;
uniform float uPixelRatio;
uniform vec4 uPlayer; // xz, presence, speed
varying float vAlpha;
varying float vKind;
void main() {
  vec3 p = position;
  float s = aSeed * 6.2831;
  p.x += sin(uTime * 0.07 + s) * 0.55 + aKind * sin(uTime * 0.03 + s * 2.0) * 1.6;
  p.y += sin(uTime * 0.05 + s * 1.7) * 0.35;
  p.z += cos(uTime * 0.06 + s * 1.3) * 0.55;
  vec2 dp = p.xz - uPlayer.xy;
  float dd = length(dp) + 0.0001;
  float near = smoothstep(1.8, 0.2, dd) * uPlayer.z;
  p.xz += dp / dd * near * (0.25 + 0.35 * uPlayer.w);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  float size = mix(1.4, 2.4, aKind) * (0.7 + 0.6 * fract(aSeed * 13.7));
  gl_PointSize = clamp(size * uPixelRatio * 55.0 / dist, 1.0, 5.0 * uPixelRatio);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed) + s * 3.0);
  vAlpha = twinkle * smoothstep(75.0, 18.0, dist) * smoothstep(0.4, 1.6, dist) * (1.0 + near * 0.8);
  vKind = aKind;
}
`;

const fragmentShader = /* glsl */ `
uniform float uActivity;
uniform float uBoot;
varying float vAlpha;
varying float vKind;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = vKind > 0.5 ? max(abs(c.x), abs(c.y)) : length(c);
  float a = smoothstep(0.5, 0.15, d) * vAlpha;
  vec3 col = mix(vec3(0.55, 0.75, 0.92), vec3(0.15, 0.85, 1.0), vKind);
  gl_FragColor = vec4(col * a * (0.45 + 0.1 * uActivity) * uBoot, 1.0);
}
`;

interface Props {
  level: number;
  converging: boolean;
  motion: number;
}

export const SignalParticleField: React.FC<Props> = ({ level, converging, motion }) => {
  const { gl } = useThree();
  const target = useLatest({ level, converging, motion });

  const geometry = useMemo(() => {
    const rand = mulberry32(2207);
    const total = ROOM_DUST + OUTER_FIELD;
    const positions = new Float32Array(total * 3);
    const seeds = new Float32Array(total);
    const kinds = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      if (i < ROOM_DUST) {
        // Dust inside the glass facility
        positions[i * 3] = (rand() - 0.5) * 11.2;
        positions[i * 3 + 1] = 0.2 + rand() * 5.2;
        positions[i * 3 + 2] = -5.6 + rand() * 12.6;
        kinds[i] = rand() < 0.15 ? 1 : 0;
      } else {
        // Radio noise / data fragments in a shell around the sector
        const dir = new THREE.Vector3(rand() - 0.5, (rand() - 0.25) * 0.8, rand() - 0.5).normalize();
        const r = 9 + Math.pow(rand(), 0.7) * 38;
        positions[i * 3] = dir.x * r;
        positions[i * 3 + 1] = THREE.MathUtils.clamp(dir.y * r + 4, -1.5, 26);
        positions[i * 3 + 2] = dir.z * r;
        kinds[i] = rand() < 0.45 ? 1 : 0;
      }
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
    return g;
  }, []);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uPlayer: { value: new THREE.Vector4(0, 0, 0, 0) },
      uBoot: { value: 0 },
    }),
    [gl]
  );
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const speed = React.useRef(1);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const t = target.current;
    // Particles slow down while the Emergency Broadcast sequence takes over
    speed.current = damp(speed.current, t.converging ? 0.3 : 1, 1.2, dt);
    uniforms.uTime.value += dt * t.motion * speed.current;
    uniforms.uActivity.value = damp(uniforms.uActivity.value, t.level, 1.0, dt);
    uniforms.uBoot.value = bootPhase(0.3);
    const pl = uniforms.uPlayer.value;
    pl.set(
      playerPresence.x,
      playerPresence.z,
      damp(pl.z, playerPresence.active, 3, dt),
      damp(pl.w, playerPresence.speed * t.motion, 4, dt)
    );
  });

  return (
    <points geometry={geometry} material={material} raycast={noRaycast} frustumCulled={false} />
  );
};
