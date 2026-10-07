"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { damp, mulberry32, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { bootPhase, lookAt } from "./worldState";

// LAYER C — distant communications network. Nodes sit on a dome around the sector and are linked
// to their nearest neighbours. Links belong to reveal tiers (0–3): the network visibly completes
// as challenges are solved, and data packets travel along every revealed link.
// Storytelling (existing progress only): at Objective 01 traffic is fragmented and stutters; each
// solve makes it more coherent, and synchronised pulses sweep outward from the facility. At
// completion every link transmits in lock-step — the network has reached a stable state.

const NODE_COUNT = 34;

const edgeVertex = /* glsl */ `
attribute float aT;
attribute float aSeed;
attribute float aTier;
varying float vT;
varying float vSeed;
varying float vTier;
varying float vR;
void main() {
  vR = length(position);
  vT = aT;
  vSeed = aSeed;
  vTier = aTier;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const edgeFragment = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uConverge;
uniform float uSurge;
uniform float uCoherence; // 0 fragmented … 1 coherent (from progress)
uniform float uLock;      // 1 once complete: all links in lock-step
uniform float uBoot;
uniform float uLook;      // looking toward the Network Map console
varying float vT;
varying float vSeed;
varying float vTier;
varying float vR;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  float reveal = smoothstep(vTier - 0.25, vTier + 0.55, uLevel);
  float speed = mix(0.05 + 0.05 * fract(vSeed * 7.13), 0.07, uLock);
  float p = fract(uTime * speed * (1.0 + uConverge * 2.0 + uLook * 0.6) + mix(vSeed, 0.0, uLock));
  float packet = smoothstep(0.045, 0.0, abs(vT - p));
  // Fragmented traffic stutters until the carrier becomes coherent
  packet *= mix(step(0.55, h1(floor(uTime * 5.0) + vSeed * 91.0)), 1.0, uCoherence);
  // Synchronised pulse sweeping outward from the facility (stronger as the network synchronises)
  float wave = fract(uTime * 0.085);
  float sync = exp(-pow((vR / 50.0 - wave) * 14.0, 2.0)) * (0.15 + 0.85 * uCoherence);
  float base = 0.22 + 0.04 * uLevel + 0.08 * uConverge;
  // Progression surge: a brightness front running along every link, then fading
  float front = smoothstep(0.18, 0.0, abs(vT - (1.0 - uSurge))) * uSurge;
  vec3 col = vec3(0.05, 0.62, 0.85) * (base + packet * 0.9 + uSurge * 0.18 + front * 0.7 + sync * 0.45 + uLook * 0.08);
  gl_FragColor = vec4(col * reveal * uBoot, 1.0);
}
`;

const nodeVertex = /* glsl */ `
attribute float aSeed;
attribute float aTier;
uniform float uTime;
uniform float uLevel;
uniform float uPixelRatio;
uniform float uSurge;
uniform float uCoherence;
uniform float uBoot;
uniform float uLook;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float reveal = smoothstep(aTier - 0.25, aTier + 0.55, uLevel);
  // Nodes twinkle independently while fragmented and settle into a shared rhythm as they synchronise
  float own = sin(uTime * (0.8 + aSeed) + aSeed * 12.0);
  float shared = sin(uTime * 0.9);
  vAlpha = reveal * (0.55 + 0.45 * mix(own, shared, uCoherence * 0.8)) * (1.0 + uSurge * 0.7 + uLook * 0.35) * uBoot;
  gl_PointSize = clamp(420.0 * uPixelRatio / -mv.z, 2.0, 9.0 * uPixelRatio);
}
`;

const nodeFragment = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.18, 0.0, d);
  float halo = smoothstep(0.5, 0.1, d) * 0.35;
  gl_FragColor = vec4(vec3(0.25, 0.9, 1.0) * (core + halo) * vAlpha, 1.0);
}
`;

interface Props {
  level: number;
  converging: boolean;
  motion: number;
}

export const NetworkBackground: React.FC<Props> = ({ level, converging, motion }) => {
  const { gl } = useThree();
  const target = useLatest({ level, converging, motion });

  const { edgeGeometry, nodeGeometry } = useMemo(() => {
    const rand = mulberry32(7741);
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const az = (i / NODE_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const el = THREE.MathUtils.degToRad(6 + rand() * 32);
      const r = 36 + rand() * 12;
      nodes.push(new THREE.Vector3(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r));
    }
    // Link each node to its two nearest neighbours (deduplicated)
    const edges = new Set<string>();
    nodes.forEach((n, i) => {
      nodes
        .map((m, j) => ({ j, d: i === j ? Infinity : n.distanceTo(m) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
    });
    const positions: number[] = [];
    const ts: number[] = [];
    const seeds: number[] = [];
    const tiers: number[] = [];
    const nodeTier = new Array(NODE_COUNT).fill(3);
    edges.forEach((key) => {
      const [a, b] = key.split("-").map(Number);
      const tier = Math.floor(rand() * 4); // 0 visible from the start (weak activity) … 3 after all challenges
      const seed = rand();
      positions.push(nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z);
      ts.push(0, 1);
      seeds.push(seed, seed);
      tiers.push(tier, tier);
      nodeTier[a] = Math.min(nodeTier[a], tier);
      nodeTier[b] = Math.min(nodeTier[b], tier);
    });
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    eg.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
    eg.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
    eg.setAttribute("aTier", new THREE.Float32BufferAttribute(tiers, 1));

    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.Float32BufferAttribute(nodes.flatMap((n) => [n.x, n.y, n.z]), 3));
    ng.setAttribute("aSeed", new THREE.Float32BufferAttribute(nodes.map(() => rand()), 1));
    ng.setAttribute("aTier", new THREE.Float32BufferAttribute(nodeTier, 1));
    return { edgeGeometry: eg, nodeGeometry: ng };
  }, []);
  useLayoutEffect(
    () => () => {
      edgeGeometry.dispose();
      nodeGeometry.dispose();
    },
    [edgeGeometry, nodeGeometry]
  );

  const edgeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uConverge: { value: 0 },
      uSurge: { value: 0 },
      uCoherence: { value: 0 },
      uLock: { value: 0 },
      uBoot: { value: 0 },
      uLook: { value: 0 },
    }),
    []
  );
  const nodeUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLevel: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() }, uSurge: { value: 0 }, uCoherence: { value: 0 }, uBoot: { value: 0 }, uLook: { value: 0 } }),
    [gl]
  );

  const edgeMaterial = useShaderMaterial(() => ({
    uniforms: edgeUniforms,
    vertexShader: edgeVertex,
    fragmentShader: edgeFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const nodeMaterial = useShaderMaterial(() => ({
    uniforms: nodeUniforms,
    vertexShader: nodeVertex,
    fragmentShader: nodeFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  // The distant network answers each progression step with one surge (plays when the view resumes)
  const surge = useRef(0);
  const prevLevel = useRef(level);
  useEffect(() => {
    if (level > prevLevel.current) surge.current = 1;
    prevLevel.current = level;
  }, [level]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const t = target.current;
    const step = dt * t.motion;
    surge.current = Math.max(0, surge.current - dt / 2.8);
    edgeUniforms.uSurge.value = surge.current;
    nodeUniforms.uSurge.value = surge.current;
    // 0 at Objective 01 → 1 once all three challenges are solved
    const coherence = damp(edgeUniforms.uCoherence.value, Math.min(1, t.level / 3), 0.6, dt);
    edgeUniforms.uCoherence.value = coherence;
    nodeUniforms.uCoherence.value = coherence;
    edgeUniforms.uLock.value = damp(edgeUniforms.uLock.value, t.level >= 4 ? 1 : 0, 0.5, dt);
    const boot = bootPhase(0.35);
    edgeUniforms.uBoot.value = boot;
    nodeUniforms.uBoot.value = boot;
    const look = lookAt("network-map");
    edgeUniforms.uLook.value = look;
    nodeUniforms.uLook.value = look;
    edgeUniforms.uTime.value += step;
    nodeUniforms.uTime.value += step;
    edgeUniforms.uLevel.value = damp(edgeUniforms.uLevel.value, t.level, 0.8, dt);
    nodeUniforms.uLevel.value = edgeUniforms.uLevel.value;
    edgeUniforms.uConverge.value = damp(edgeUniforms.uConverge.value, t.converging ? 1 : 0, 1.5, dt);
  });

  return (
    <group>
      <lineSegments geometry={edgeGeometry} material={edgeMaterial} raycast={noRaycast} frustumCulled={false} />
      <points geometry={nodeGeometry} material={nodeMaterial} raycast={noRaycast} frustumCulled={false} />
    </group>
  );
};
