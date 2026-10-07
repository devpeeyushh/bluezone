"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Shared helpers for the visual-only environment layers.
// Nothing in this folder touches gameplay: no collision, no interaction, no store writes.

// Decorative objects must never be hit by raycasts (drei <Html occlude> raycasts the whole scene,
// so particles/lines would otherwise make station labels flicker).
export const noRaycast = () => null;

// Deterministic PRNG so the generated world is identical on every load.
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Frame-rate independent exponential smoothing
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Keep the latest prop value in a ref (read inside useFrame without re-subscribing)
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

// Build a ShaderMaterial once and keep OUR uniforms object attached by reference.
// (R3F's <shaderMaterial uniforms={...}> copies each uniform into a new object, so values
// animated through the original object would never reach the GPU.) Disposed on unmount.
export function useShaderMaterial(build: () => THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => new THREE.ShaderMaterial(build()), []);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

// Single reduced-motion hook for the whole feature (three-free; shared with the landing UI)
export { usePrefersReducedMotion } from "../../../utils/useReducedMotion";

// Motion multiplier applied to all ambient animation when reduced motion is requested
export const REDUCED_MOTION_SCALE = 0.25;

// GLSL helpers (value noise / fbm / 1D hash)
export const GLSL_NOISE = /* glsl */ `
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

// Shared vertex shader for flat quads that only need UVs
export const UV_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Distant Forensics antenna mast (x, top height, z): endpoint of the reconstructed Radio → Forensics route
export const FORENSICS_TOWER: [number, number, number] = [26, 20, -40];
