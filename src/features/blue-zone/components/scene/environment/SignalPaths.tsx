"use client";

import React, { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RADIO_STATIONS } from "../../../data/mockRadioData";
import { StationId } from "../../../types/radio.types";
import { FORENSICS_TOWER, damp, noRaycast, useLatest } from "./envUtils";

// World-space transmission arcs that appear as the investigation progresses. Each arc sweeps in
// (bright leading edge) when its tier unlocks, then carries data packets.
//   tier 1 (after Challenge 01): terminal → voice archive / signal monitor
//   tier 2 (after Challenge 02): signal monitor / voice archive → network map
//   tier 3 (after Challenge 03): network map → Forensics mast (the reconstructed route),
//                                and every station converges on the Emergency Broadcast relay

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uConverge;
uniform float uSpeed;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float x = vUv.x;
  if (x > uReveal || uReveal < 0.002) discard;
  float t = uTime * uSpeed * (1.0 + uConverge * 1.5);
  float p1 = fract(t);
  float p2 = fract(t + 0.5);
  float packets = smoothstep(0.035, 0.0, abs(x - p1)) + smoothstep(0.035, 0.0, abs(x - p2));
  float head = smoothstep(0.06, 0.0, uReveal - x) * step(uReveal, 0.995);
  float a = 0.16 + packets * 0.85 + head * 1.5 + uConverge * 0.18;
  a *= smoothstep(0.0, 0.03, x) * smoothstep(1.0, 0.97, x);
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

const anchor = (id: StationId): THREE.Vector3 => {
  const s = RADIO_STATIONS.find((st) => st.id === id)!;
  return new THREE.Vector3(s.position3D[0], s.position3D[1] + 0.75, s.position3D[2]);
};

interface PathDef {
  from: THREE.Vector3;
  to: THREE.Vector3;
  lift: number;
  tier: number;
  radius: number;
  color: string;
  speed: number;
  control?: THREE.Vector3;
}

const PATHS: PathDef[] = [
  { from: anchor("communication-terminal"), to: anchor("voice-archive"), lift: 1.4, tier: 1, radius: 0.016, color: "#19d4ff", speed: 0.18 },
  { from: anchor("communication-terminal"), to: anchor("signal-monitor"), lift: 1.8, tier: 1, radius: 0.016, color: "#19d4ff", speed: 0.15 },
  { from: anchor("signal-monitor"), to: anchor("network-map"), lift: 2.2, tier: 2, radius: 0.016, color: "#2fa8ff", speed: 0.14 },
  { from: anchor("voice-archive"), to: anchor("network-map"), lift: 1.9, tier: 2, radius: 0.016, color: "#2fa8ff", speed: 0.16 },
  {
    // The reconstructed Radio → Forensics route leaves the facility through the glass
    from: anchor("network-map"),
    to: new THREE.Vector3(FORENSICS_TOWER[0], FORENSICS_TOWER[1] * 0.92, FORENSICS_TOWER[2]),
    control: new THREE.Vector3(9, 4.4, -14),
    lift: 0,
    tier: 3,
    radius: 0.04,
    color: "#3fe0ff",
    speed: 0.08,
  },
  { from: anchor("network-map"), to: anchor("emergency-broadcast"), lift: 1.3, tier: 3, radius: 0.018, color: "#ff5468", speed: 0.22 },
  { from: anchor("communication-terminal"), to: anchor("emergency-broadcast"), lift: 1.7, tier: 3, radius: 0.018, color: "#ff5468", speed: 0.2 },
  { from: anchor("voice-archive"), to: anchor("emergency-broadcast"), lift: 2.4, tier: 3, radius: 0.018, color: "#ff5468", speed: 0.18 },
];

const CALM_COLOR = new THREE.Color("#3fe0ff");

interface Props {
  level: number;
  converging: boolean;
  motion: number;
}

export const SignalPaths: React.FC<Props> = ({ level, converging, motion }) => {
  const latest = useLatest({ level, converging, motion });

  const paths = useMemo(
    () =>
      PATHS.map((def) => {
        const control =
          def.control ?? def.from.clone().lerp(def.to, 0.5).add(new THREE.Vector3(0, def.lift, 0));
        const curve = new THREE.QuadraticBezierCurve3(def.from, control, def.to);
        const geometry = new THREE.TubeGeometry(curve, def.radius > 0.03 ? 96 : 48, def.radius, 5, false);
        const uniforms = {
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uConverge: { value: 0 },
          uSpeed: { value: def.speed },
          uColor: { value: new THREE.Color(def.color) },
        };
        const material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        return { def, geometry, uniforms, material, baseColor: new THREE.Color(def.color) };
      }),
    []
  );
  useLayoutEffect(
    () => () =>
      paths.forEach((p) => {
        p.geometry.dispose();
        p.material.dispose();
      }),
    [paths]
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const { level: lvl, converging: conv, motion: mo } = latest.current;
    for (let i = 0; i < paths.length; i++) {
      const { def, uniforms, baseColor } = paths[i];
      uniforms.uTime.value += dt * mo;
      const active = lvl >= def.tier;
      // Sweep in over ~1.5s when the tier unlocks (instant under reduced motion)
      uniforms.uReveal.value = active
        ? mo < 1
          ? 1
          : Math.min(1, uniforms.uReveal.value + dt * 0.7)
        : damp(uniforms.uReveal.value, 0, 3, dt);
      uniforms.uConverge.value = damp(uniforms.uConverge.value, conv ? 1 : 0, 1.5, dt);
      // Once the trail is complete the converging (red) paths settle to a calm cyan
      uniforms.uColor.value.lerp(lvl >= 4 ? CALM_COLOR : baseColor, 1 - Math.exp(-1.5 * dt));
    }
  });

  return (
    <group>
      {paths.map(({ def, geometry, material }, i) => (
        <mesh key={i} geometry={geometry} material={material} raycast={noRaycast} frustumCulled={def.radius < 0.03} />
      ))}
    </group>
  );
};
