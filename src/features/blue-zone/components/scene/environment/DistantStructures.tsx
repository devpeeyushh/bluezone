"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FORENSICS_TOWER, UV_VERTEX, damp, mulberry32, noRaycast, useLatest, useShaderMaterial } from "./envUtils";

// Visual-only silhouettes outside the glass facility: city blocks with dim lit floors,
// antenna masts with blinking tip lights, and radio rings expanding from three mast tops.
// No collision, no interaction — everything sits far outside the playable bounds.

const BUILDING_COUNT = 44;

const structureVertex = /* glsl */ `
attribute float aSeed;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const structureFragment = /* glsl */ `
uniform float uTime;
uniform float uActivity;
uniform vec3 uFogColor;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
void main() {
  vec3 base = vec3(0.010, 0.022, 0.042);
  float side = 1.0 - abs(vNormalW.y);
  float rowId = floor(vWorld.y / 0.9);
  float row = fract(vWorld.y / 0.9);
  float band = smoothstep(0.0, 0.05, row) * smoothstep(0.17, 0.11, row);
  float lit = step(0.58, fract(sin(rowId * 12.9898 + vSeed * 78.233) * 43758.5453));
  float flick = 0.65 + 0.35 * sin(uTime * (0.4 + vSeed) + vSeed * 20.0);
  vec3 c = base + vec3(0.04, 0.30, 0.40) * band * lit * flick * side * (0.45 + 0.15 * uActivity);
  // Rim light on the top edges
  c += vec3(0.0, 0.12, 0.16) * smoothstep(0.7, 1.0, vNormalW.y) * 0.4;
  float d = length(vWorld - cameraPosition);
  c = mix(c, uFogColor, smoothstep(18.0, 100.0, d) * 0.85);
  gl_FragColor = vec4(c, 1.0);
}
`;

const tipVertex = /* glsl */ `
attribute float aSeed;
attribute float aKind;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
varying float vKind;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float blink = aKind < 0.5
    ? step(fract(uTime * 0.45 + aSeed), 0.18)
    : 0.55 + 0.45 * sin(uTime * 2.2 + aSeed * 6.28);
  vAlpha = blink;
  vKind = aKind;
  gl_PointSize = clamp(260.0 * uPixelRatio / -mv.z, 2.0, 7.0 * uPixelRatio);
}
`;

const tipFragment = /* glsl */ `
varying float vAlpha;
varying float vKind;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  vec3 col = vKind < 0.5 ? vec3(1.0, 0.18, 0.25) : vec3(0.2, 0.9, 1.0);
  gl_FragColor = vec4(col * a * 0.9, 1.0);
}
`;

const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uStrength;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float t = fract(uTime * 0.11 + uPhase);
  float ring = smoothstep(0.025, 0.0, abs(r - t)) * (1.0 - t);
  float ring2 = smoothstep(0.02, 0.0, abs(r - fract(t + 0.5))) * (1.0 - fract(t + 0.5));
  gl_FragColor = vec4(uColor * (ring + ring2 * 0.6) * uStrength, 1.0);
}
`;

// Mast layout (base on the ground). The Forensics mast is the endpoint of the solved network route.
const TOWERS: { pos: [number, number, number]; height: number; ring?: number }[] = [
  { pos: [FORENSICS_TOWER[0], 0, FORENSICS_TOWER[2]], height: FORENSICS_TOWER[1], ring: 0 },
  { pos: [-30, 0, -34], height: 24, ring: 0.33 },
  { pos: [-44, 0, 6], height: 18 },
  { pos: [40, 0, 10], height: 22, ring: 0.66 },
  { pos: [-18, 0, 44], height: 16 },
  { pos: [12, 0, -54], height: 27 },
  { pos: [47, 0, -22], height: 15 },
];

// Shared with LightShafts (signal beams rise from these mast tips)
export const DISTANT_TOWERS = TOWERS;

const RING_COLORS = { forensics: new THREE.Color("#2fd2ff"), other: new THREE.Color("#1aa6c9") };

interface Props {
  level: number;
  motion: number;
}

export const DistantStructures: React.FC<Props> = ({ level, motion }) => {
  const { gl } = useThree();
  const buildingsRef = useRef<THREE.InstancedMesh>(null);
  const mastsRef = useRef<THREE.InstancedMesh>(null);
  const target = useLatest({ level, motion });

  const fogColor = useMemo(() => new THREE.Color("#0a2236"), []);
  const structureUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uActivity: { value: 0 }, uFogColor: { value: fogColor } }),
    [fogColor]
  );
  const tipUniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() } }), [gl]);
  const ringUniforms = useMemo(
    () =>
      TOWERS.filter((t) => t.ring !== undefined).map((t, i) => ({
        uTime: { value: 0 },
        uPhase: { value: t.ring ?? 0 },
        uStrength: { value: 0 },
        uColor: { value: i === 0 ? RING_COLORS.forensics : RING_COLORS.other },
      })),
    []
  );
  const structureMaterial = useShaderMaterial(() => ({
    uniforms: structureUniforms,
    vertexShader: structureVertex,
    fragmentShader: structureFragment,
  }));
  const tipMaterial = useShaderMaterial(() => ({
    uniforms: tipUniforms,
    vertexShader: tipVertex,
    fragmentShader: tipFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const ringMaterials = useMemo(
    () =>
      ringUniforms.map(
        (uniforms) =>
          new THREE.ShaderMaterial({
            uniforms,
            vertexShader: UV_VERTEX,
            fragmentShader: ringFragment,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          })
      ),
    [ringUniforms]
  );
  useLayoutEffect(() => () => ringMaterials.forEach((m) => m.dispose()), [ringMaterials]);

  // Generate the layout once (deterministic)
  const layout = useMemo(() => {
    const rand = mulberry32(1103);
    const buildings: { x: number; z: number; w: number; d: number; h: number; rot: number }[] = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const angle = (i / BUILDING_COUNT) * Math.PI * 2 + rand() * 0.12;
      const radius = 24 + rand() * 36;
      buildings.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        w: 2 + rand() * 4.5,
        d: 2 + rand() * 4.5,
        h: 3 + Math.pow(rand(), 1.6) * 15,
        rot: rand() * Math.PI,
      });
    }
    const seeds = new Float32Array(BUILDING_COUNT).map(() => rand());
    const mastSeeds = new Float32Array(TOWERS.length).map(() => rand());
    // Tip lights: one aviation light per mast plus a cyan beacon on the Forensics mast
    const tipPositions: number[] = [];
    const tipSeeds: number[] = [];
    const tipKinds: number[] = [];
    TOWERS.forEach((t, i) => {
      tipPositions.push(t.pos[0], t.height + 0.2, t.pos[2]);
      tipSeeds.push(rand());
      tipKinds.push(0);
      if (i === 0) {
        tipPositions.push(t.pos[0], t.height * 0.6, t.pos[2]);
        tipSeeds.push(rand());
        tipKinds.push(1);
      }
    });
    return { buildings, seeds, mastSeeds, tipPositions: new Float32Array(tipPositions), tipSeeds: new Float32Array(tipSeeds), tipKinds: new Float32Array(tipKinds) };
  }, []);

  const tipGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layout.tipPositions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(layout.tipSeeds, 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(layout.tipKinds, 1));
    return g;
  }, [layout]);
  useLayoutEffect(() => () => tipGeometry.dispose(), [tipGeometry]);

  // Write instance matrices once
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    if (buildingsRef.current) {
      layout.buildings.forEach((b, i) => {
        q.setFromAxisAngle(up, b.rot);
        m.compose(p.set(b.x, b.h / 2, b.z), q, s.set(b.w, b.h, b.d));
        buildingsRef.current!.setMatrixAt(i, m);
      });
      buildingsRef.current.instanceMatrix.needsUpdate = true;
    }
    if (mastsRef.current) {
      TOWERS.forEach((t, i) => {
        m.compose(p.set(t.pos[0], t.height / 2, t.pos[2]), q.identity(), s.set(1, t.height, 1));
        mastsRef.current!.setMatrixAt(i, m);
      });
      mastsRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [layout]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const { level: lvl, motion: mo } = target.current;
    const step = dt * mo;
    structureUniforms.uTime.value += step;
    structureUniforms.uActivity.value = damp(structureUniforms.uActivity.value, lvl, 1.0, dt);
    tipUniforms.uTime.value += step;
    ringUniforms.forEach((u, i) => {
      u.uTime.value += step;
      // The Forensics mast ring strengthens as the route to it is reconstructed
      const strength = i === 0 ? 0.12 + 0.12 * Math.min(lvl, 4) : 0.14 + 0.04 * Math.min(lvl, 3);
      u.uStrength.value = damp(u.uStrength.value, strength, 1.0, dt);
    });
  });

  const ringTowers = TOWERS.filter((t) => t.ring !== undefined);

  return (
    <group>
      <instancedMesh ref={buildingsRef} args={[undefined, structureMaterial, BUILDING_COUNT]} raycast={noRaycast} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-aSeed" args={[layout.seeds, 1]} />
        </boxGeometry>
      </instancedMesh>

      <instancedMesh ref={mastsRef} args={[undefined, structureMaterial, TOWERS.length]} raycast={noRaycast} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.22, 1, 6]}>
          <instancedBufferAttribute attach="attributes-aSeed" args={[layout.mastSeeds, 1]} />
        </cylinderGeometry>
      </instancedMesh>

      <points geometry={tipGeometry} material={tipMaterial} raycast={noRaycast} frustumCulled={false} />

      {ringTowers.map((t, i) => (
        <mesh
          key={i}
          material={ringMaterials[i]}
          position={[t.pos[0], t.height * 0.92, t.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={noRaycast}
          frustumCulled={false}
        >
          <planeGeometry args={[i === 0 ? 26 : 18, i === 0 ? 26 : 18]} />
        </mesh>
      ))}
    </group>
  );
};
