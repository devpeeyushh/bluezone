"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RADIO_STATIONS } from "../../../data/mockRadioData";
import { getStationStatus } from "../../../utils/stationStatus";
import { damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { useProgressSnapshot } from "./useEnvironmentState";
import { playerPresence } from "./playerPresence";

// Animated signal layer over the facility floor: a scan sweep every few seconds plus radio
// ripples emitted by each station according to its existing status. Single draw call.
// Also: a faint halo that follows the player (nearby station ripples strengthen), and a single
// energy wave from a station whenever its status changes (e.g. a challenge is verified).

const SOURCE_COUNT = RADIO_STATIONS.length; // 5

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
uniform vec4 uSources[${SOURCE_COUNT}];   // xz position, strength, flicker (locked instability)
uniform vec3 uSourceColors[${SOURCE_COUNT}];
uniform vec3 uPlayer;   // xz, presence
uniform vec4 uWave;     // xz origin, progress 0..1, strength
uniform vec3 uWaveColor;
varying vec3 vWorld;
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vec2 p = vWorld.xz;
  vec3 col = vec3(0.0);

  // Scan sweep travelling from the back wall towards the open front
  float sw = mix(-6.5, 8.5, fract(uTime / 9.0));
  float sweep = exp(-pow((p.y - sw) * 3.0, 2.0));
  col += vec3(0.0, 0.42, 0.58) * sweep * (0.12 + 0.03 * uLevel);

  for (int i = 0; i < ${SOURCE_COUNT}; i++) {
    vec4 s = uSources[i];
    if (s.z <= 0.001) continue;
    float d = length(p - s.xy);
    float ph = fract(uTime * 0.22 + float(i) * 0.19);
    float ring = exp(-pow((d - ph * 3.4) * 7.0, 2.0)) * (1.0 - ph);
    float core = exp(-d * d * 1.8) * 0.3;
    // Locked / fragmented sources stutter
    float stutter = mix(1.0, step(0.45, hash1(floor(uTime * 7.0) + float(i) * 17.0)), s.w);
    // Sources near the player respond to their presence
    vec2 sp = s.xy - uPlayer.xy;
    float boost = 1.0 + 0.6 * exp(-dot(sp, sp) * 0.18) * uPlayer.z;
    col += uSourceColors[i] * (ring * 0.55 + core) * s.z * stutter * boost;
  }

  // Player presence: a soft halo and a slow, thin ring around the feet
  vec2 pp = p - uPlayer.xy;
  float pd = length(pp);
  float halo = exp(-pd * pd * 2.2) * 0.06;
  float pring = smoothstep(0.03, 0.0, abs(pd - (0.75 + 0.08 * sin(uTime * 1.3)))) * 0.05;
  col += vec3(0.0, 0.5, 0.65) * (halo + pring) * uPlayer.z;

  // Status-change energy wave (one ring travelling outward through the facility)
  if (uWave.w > 0.001) {
    float wd = length(p - uWave.xy);
    float wr = uWave.z * 13.0;
    float wave = exp(-pow((wd - wr) * 4.0, 2.0)) * (1.0 - uWave.z);
    col += uWaveColor * wave * uWave.w * 0.55;
  }

  // Soft pooled light across the operations floor (keeps the floor from reading as a void)
  float pool = exp(-dot(p - vec2(0.0, -0.5), p - vec2(0.0, -0.5)) * 0.035);
  col += vec3(0.0, 0.16, 0.22) * pool * 0.18;

  // Faint glow where the floor meets the glass walls
  float edge = smoothstep(5.0, 5.9, max(abs(p.x), -p.y));
  col += vec3(0.0, 0.28, 0.38) * edge * 0.07;

  gl_FragColor = vec4(col, 1.0);
}
`;

const COLORS = {
  cyan: new THREE.Color(0.0, 0.62, 0.85),
  verified: new THREE.Color(0.05, 0.6, 0.45),
  red: new THREE.Color(0.9, 0.08, 0.16),
  amber: new THREE.Color(0.95, 0.35, 0.2),
};

export const FloorSignalLayer: React.FC<{ level: number; motion: number }> = ({ level, motion }) => {
  const progress = useProgressSnapshot();

  // Per-source targets derived from existing station status (recomputed only when progress changes)
  const targets = useMemo(
    () =>
      RADIO_STATIONS.map((station) => {
        const status = getStationStatus(station.id, progress);
        let strength = 0;
        let flicker = 0;
        let color = COLORS.cyan;
        if (station.id === "emergency-broadcast") {
          if (status.isLocked) {
            strength = 0.18;
            flicker = 1;
            color = COLORS.red;
          } else if (!progress.completed) {
            strength = 0.95;
            flicker = 0.5;
            color = COLORS.amber;
          } else {
            strength = 0.4;
            color = COLORS.cyan;
          }
        } else if (status.isLocked) {
          strength = 0;
        } else if (status.label === "VERIFIED") {
          strength = 0.22;
          color = COLORS.verified;
        } else {
          // Available: before Challenge 01 the terminal emits weak, fragmented pulses
          strength = station.id === "communication-terminal" && !progress.challenge1Solved ? 0.45 : 0.6;
          flicker = station.id === "communication-terminal" && !progress.challenge1Solved ? 0.6 : 0;
        }
        return { strength, flicker, color };
      }),
    [progress]
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uSources: { value: RADIO_STATIONS.map((s) => new THREE.Vector4(s.position3D[0], s.position3D[2], 0, 0)) },
      uSourceColors: { value: RADIO_STATIONS.map(() => new THREE.Color(0, 0, 0)) },
      uPlayer: { value: new THREE.Vector3(0, 0, 0) },
      uWave: { value: new THREE.Vector4(0, 0, 1, 0) },
      uWaveColor: { value: new THREE.Color(0, 0, 0) },
    }),
    []
  );
  const material = useShaderMaterial(() => ({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const latest = useLatest({ targets, level, motion });

  // Fire one wave from the station whose status just changed (solved stations take priority).
  // Deterministic: derived only from the existing status labels.
  const prevLabels = useRef<string[] | null>(null);
  useEffect(() => {
    const labels = RADIO_STATIONS.map((st) => getStationStatus(st.id, progress).label);
    const prev = prevLabels.current;
    prevLabels.current = labels;
    if (!prev) return;
    let origin = -1;
    labels.forEach((label, i) => {
      if (label === prev[i]) return;
      const solved = label === "VERIFIED" || label === "COMPLETE";
      if (origin === -1 || solved) origin = i;
    });
    if (origin === -1) return;
    const [ox, , oz] = RADIO_STATIONS[origin].position3D;
    uniforms.uWave.value.set(ox, oz, 0, 1);
    uniforms.uWaveColor.value.copy(progress.completed ? COLORS.cyan : COLORS.verified);
  }, [progress, uniforms]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const { targets: tg, level: lvl, motion: mo } = latest.current;
    uniforms.uTime.value += dt * mo;
    uniforms.uLevel.value = damp(uniforms.uLevel.value, lvl, 1.0, dt);
    const pl = uniforms.uPlayer.value;
    pl.set(playerPresence.x, playerPresence.z, damp(pl.z, playerPresence.active, 3, dt));
    const wave = uniforms.uWave.value;
    if (wave.w > 0) {
      wave.z = Math.min(1, wave.z + dt / 2.6);
      if (wave.z >= 1) wave.w = 0;
    }
    for (let i = 0; i < SOURCE_COUNT; i++) {
      const src = uniforms.uSources.value[i];
      src.z = damp(src.z, tg[i].strength, 1.4, dt);
      src.w = damp(src.w, tg[i].flicker, 2.0, dt);
      uniforms.uSourceColors.value[i].lerp(tg[i].color, 1 - Math.exp(-2.0 * dt));
    }
  });

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} raycast={noRaycast}>
      <planeGeometry args={[16, 16]} />
    </mesh>
  );
};
