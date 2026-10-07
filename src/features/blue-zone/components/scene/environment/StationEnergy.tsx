"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StationConfig } from "../../../types/radio.types";
import { useBlueZoneStore } from "../../../store/useBlueZoneStore";
import { getStationStatus } from "../../../utils/stationStatus";
import { UV_VERTEX, damp, noRaycast, useLatest, useShaderMaterial } from "./envUtils";
import { useProgressSnapshot } from "./useEnvironmentState";
import { playerPresence, presenceNearness } from "./playerPresence";
import { lookAt } from "./worldState";

// Visual "life" for each station, driven only by its existing status and interaction focus:
//  - a floor ring (locked: red instability, unlocked: cyan activation, verified: calm teal,
//    in range: acknowledgement pulses, status change: activation burst)
//  - a holographic projection above the console with a station-specific pattern.
// Proximity (uNear) wakes the station gradually as the player approaches; focus (the existing
// interaction target) adds a scan line and a one-shot "target acquired" ring. Both ease in and out.
// Looking toward a station (uLook) makes its projection more active (terminal packets, voice
// waveform, spectrum bands, network nodes, relay warning) without selecting anything, and up close
// the projection shifts slightly with the player's viewing angle (uParallax) so it reads as depth.
// Separate from InteractiveStation so the station's own meshes, clicks and labels are untouched.

const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uFocus;
uniform float uLocked;
uniform float uBurst;
uniform float uIntensity;
uniform float uNear;
uniform float uAcquire;
uniform vec3 uColor;
varying vec2 vUv;
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vec2 c = (vUv - 0.5) * 2.0;
  float r = length(c);
  float ang = atan(c.y, c.x);
  float ring = smoothstep(0.035, 0.0, abs(r - 0.74));
  float dashes = step(0.5, fract(ang * 9.0 / 6.2831 + uTime * 0.06)) * smoothstep(0.018, 0.0, abs(r - 0.86));
  float inner = smoothstep(0.62, 0.0, r) * 0.1;
  float ph = fract(uTime * 0.7);
  float pulse = smoothstep(0.035, 0.0, abs(r - ph)) * (1.0 - ph) * uFocus;
  float burst = smoothstep(0.06, 0.0, abs(r - (1.0 - uBurst) * 0.98)) * uBurst;
  float flick = mix(1.0, 0.45 + 0.55 * step(0.5, hash1(floor(uTime * 9.0))), uLocked);
  // Acquire: a thin ring contracting onto the console when it becomes the interaction target
  float acq = smoothstep(0.03, 0.0, abs(r - (0.74 + uAcquire * 0.24))) * uAcquire;
  float a = (ring * 0.6 + dashes * 0.35 + inner) * uIntensity * flick * (1.0 + uFocus * 0.6 + uNear * 0.35)
          + pulse * 0.7 + burst * 1.1 + acq * 0.8;
  a *= smoothstep(1.0, 0.93, r);
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

const holoFragment = /* glsl */ `
uniform float uTime;
uniform float uMode;
uniform float uFocus;
uniform float uLocked;
uniform float uIntensity;
uniform float uLevel;
uniform float uNear;
uniform float uLook;
uniform float uParallax;
uniform vec3 uColor;
varying vec2 vUv;
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vec2 uv = vUv;
  vec2 frame = vUv;
  uv.x += uParallax * 0.08;
  float t = uTime;
  float a = 0.0;
  if (uMode < 0.5) {
    // COMMUNICATION TERMINAL — streaming packet fragments + scan
    float rows = 9.0;
    float row = floor(uv.y * rows);
    float y = fract(uv.y * rows);
    float speed = 0.12 + hash1(row) * 0.3;
    float x = fract(uv.x * 0.7 - t * speed + hash1(row * 3.1));
    float blk = step(0.55, hash1(floor(x * 9.0) + row * 13.0 + floor(t * speed * 2.0)));
    a = blk * step(0.28, y) * step(y, 0.72) * 0.45;
    a += smoothstep(0.02, 0.0, abs(uv.y - fract(t * 0.25))) * 0.55;
  } else if (uMode < 1.5) {
    // VOICE ARCHIVE — waveform ribbon
    float env = 0.22 + 0.18 * sin(t * 0.7) + 0.08 * sin(t * 1.9);
    float w = 0.5 + sin(uv.x * 22.0 + t * 2.2) * 0.2 * env
                  + sin(uv.x * 57.0 - t * 3.1) * 0.06
                  + (hash1(floor(uv.x * 60.0) + floor(t * 8.0)) - 0.5) * 0.05;
    a = smoothstep(0.025, 0.0, abs(uv.y - w)) * 0.9 + smoothstep(0.12, 0.0, abs(uv.y - w)) * 0.22;
  } else if (uMode < 2.5) {
    // SIGNAL MONITOR — spectrum bars + moving scan
    float bars = 24.0;
    float b = floor(uv.x * bars);
    float bx = fract(uv.x * bars);
    float h = 0.12 + 0.72 * abs(sin(b * 0.7 + t * (0.6 + hash1(b) * 1.4))) * (0.4 + 0.6 * hash1(b + floor(t * 2.0)));
    a = step(uv.y, h) * step(0.18, bx) * step(bx, 0.82) * 0.4;
    a += smoothstep(0.012, 0.0, abs(uv.x - fract(t * 0.18))) * 0.7;
  } else if (uMode < 3.5) {
    // NETWORK MAP — nodes, links and travelling packets
    vec2 g = uv * vec2(6.0, 3.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 o = vec2(hash1(id.x + id.y * 7.0) - 0.5, hash1(id.y + id.x * 3.0) - 0.5) * 0.4;
    float node = smoothstep(0.09, 0.0, length(f - o)) * (0.6 + 0.4 * sin(t * 2.0 + hash1(id.x * 5.0 + id.y) * 6.0));
    float link = smoothstep(0.012, 0.0, abs(f.y - o.y)) * step(0.4, hash1(id.x + id.y * 11.0));
    float pk = smoothstep(0.06, 0.0, abs(f.x - (fract(t * 0.5 + hash1(id.y)) - 0.5))) * link;
    a = node + link * 0.22 + pk * 0.8;
  } else {
    // EMERGENCY BROADCAST — warning arcs, instability grows with progress
    vec2 c = uv - vec2(0.5, 0.0);
    c.x *= 2.4;
    float r = length(c);
    float arcs = smoothstep(0.045, 0.0, abs(fract(r * 3.0 - t * (0.4 + uLevel * 0.15)) - 0.5) - 0.42);
    float glitch = step(0.9 - uLevel * 0.04, hash1(floor(uv.y * 22.0) + floor(t * 12.0)));
    a = arcs * 0.5 * step(uv.y, 0.95) + glitch * 0.25 * (0.4 + uLocked);
    a *= 0.6 + 0.4 * sin(t * (2.0 + uLevel * 1.5));
  }
  // Locked stations show only a dim, unstable projection
  a *= 1.0 - uLocked * 0.75 * step(uMode, 3.5);
  float edge = max(smoothstep(0.015, 0.0, frame.x) + smoothstep(0.985, 1.0, frame.x),
                   smoothstep(0.03, 0.0, frame.y) + smoothstep(0.97, 1.0, frame.y));
  float scan = 0.75 + 0.25 * sin(uv.y * 140.0);
  float noise = hash1(floor(uv.x * 90.0) + floor(uv.y * 50.0) * 90.0 + floor(t * 20.0)) * uLocked * 0.18;
  // Focus: one thin scan line sweeping down the projection
  float focusScan = smoothstep(0.012, 0.0, abs(uv.y - (1.0 - fract(t * 0.55)))) * uFocus * 0.6;
  float alpha = (a * (scan + uLook * 0.35) + edge * (0.22 + 0.2 * uFocus) + noise + focusScan) * uIntensity * (0.75 + 0.25 * uNear + 0.4 * uFocus + 0.2 * uLook);
  alpha *= smoothstep(0.0, 0.12, uv.y) * 0.85 + 0.15;
  gl_FragColor = vec4(uColor * alpha, 1.0);
}
`;

const MODE: Record<StationConfig["id"], number> = {
  "communication-terminal": 0,
  "voice-archive": 1,
  "signal-monitor": 2,
  "network-map": 3,
  "emergency-broadcast": 4,
};

const LOCKED_RED = new THREE.Color("#ff3344");
const VERIFIED_TEAL = new THREE.Color("#22d3a6");

interface Props {
  station: StationConfig;
  level: number;
  motion: number;
}

export const StationEnergy: React.FC<Props> = ({ station, level, motion }) => {
  const progress = useProgressSnapshot();
  const isFocused = useBlueZoneStore((s) => s.interactionPrompt?.targetId === station.id);
  const status = getStationStatus(station.id, progress);

  const isBroadcast = station.id === "emergency-broadcast";
  const verified = status.label === "VERIFIED" || status.label === "COMPLETE";
  const targetColor = useMemo(() => {
    if (status.isLocked) return LOCKED_RED;
    if (verified) return VERIFIED_TEAL;
    // Override-ready broadcast stays red/amber: it should feel dangerous until the trail is complete
    if (isBroadcast) return new THREE.Color("#ff5a4a");
    return new THREE.Color(status.color);
  }, [status.isLocked, status.color, verified, isBroadcast]);

  const intensity = status.isLocked
    ? isBroadcast
      ? 0.35 + 0.08 * level
      : 0.28
    : verified
      ? 0.45
      : isBroadcast
        ? 1.0
        : 0.85;

  const ringUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uLocked: { value: 0 },
      uBurst: { value: 0 },
      uIntensity: { value: 0 },
      uNear: { value: 0 },
      uAcquire: { value: 0 },
      uColor: { value: new THREE.Color(0, 0, 0) },
    }),
    []
  );
  const holoUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMode: { value: MODE[station.id] },
      uFocus: { value: 0 },
      uLocked: { value: 0 },
      uIntensity: { value: 0 },
      uLevel: { value: 0 },
      uNear: { value: 0 },
      uLook: { value: 0 },
      uParallax: { value: 0 },
      uColor: { value: new THREE.Color(0, 0, 0) },
    }),
    [station.id]
  );

  const ringMaterial = useShaderMaterial(() => ({
    uniforms: ringUniforms,
    vertexShader: UV_VERTEX,
    fragmentShader: ringFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const holoMaterial = useShaderMaterial(() => ({
    uniforms: holoUniforms,
    vertexShader: UV_VERTEX,
    fragmentShader: holoFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  // Activation burst whenever the station's status changes (e.g. unlocked by a solved challenge)
  const burst = useRef(0);
  const prevLabel = useRef(status.label);
  useEffect(() => {
    if (prevLabel.current !== status.label) {
      prevLabel.current = status.label;
      burst.current = 1;
    }
  }, [status.label]);

  // One-shot acquire ring each time this station becomes the interaction target
  const acquire = useRef(0);
  useEffect(() => {
    if (isFocused) acquire.current = 1;
  }, [isFocused]);

  const latest = useLatest({ isFocused, locked: status.isLocked, intensity, targetColor, level, motion });
  const [sx, , sz] = station.position3D;
  // Station's local right axis on the floor (for the viewing-angle parallax)
  const rotY = station.rotation3D[1];
  const rightX = Math.cos(rotY);
  const rightZ = -Math.sin(rotY);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const t = latest.current;
    const k = 1 - Math.exp(-3 * dt);
    // Proximity wakes the station: brighter ring, slightly faster projection
    const near = damp(ringUniforms.uNear.value, presenceNearness(sx, sz, 2.0, 3.9), 3, dt);
    ringUniforms.uNear.value = near;
    holoUniforms.uNear.value = near;
    const look = lookAt(station.id);
    holoUniforms.uLook.value = look;
    // Lateral offset of the player relative to the console, only meaningful up close
    const px = playerPresence.x - sx;
    const pz = playerPresence.z - sz;
    const lateral = (px * rightX + pz * rightZ) / (Math.hypot(px, pz) || 1);
    holoUniforms.uParallax.value = damp(holoUniforms.uParallax.value, lateral * near * t.motion, 4, dt);
    const step = dt * t.motion * (1 + near * 0.45 + look * 0.5);
    ringUniforms.uTime.value += step;
    holoUniforms.uTime.value += step;
    acquire.current = Math.max(0, acquire.current - dt / 0.6);
    ringUniforms.uAcquire.value = acquire.current * acquire.current;
    burst.current = Math.max(0, burst.current - dt / 1.4);
    ringUniforms.uBurst.value = burst.current;
    ringUniforms.uFocus.value = damp(ringUniforms.uFocus.value, t.isFocused ? 1 : 0, 6, dt);
    holoUniforms.uFocus.value = ringUniforms.uFocus.value;
    ringUniforms.uLocked.value = damp(ringUniforms.uLocked.value, t.locked ? 1 : 0, 3, dt);
    holoUniforms.uLocked.value = ringUniforms.uLocked.value;
    ringUniforms.uIntensity.value = damp(ringUniforms.uIntensity.value, t.intensity, 2.5, dt);
    holoUniforms.uIntensity.value = ringUniforms.uIntensity.value * 0.8;
    holoUniforms.uLevel.value = damp(holoUniforms.uLevel.value, t.level, 1, dt);
    ringUniforms.uColor.value.lerp(t.targetColor, k);
    holoUniforms.uColor.value.copy(ringUniforms.uColor.value);
  });

  const [x, , z] = station.position3D;

  return (
    <group>
      {/* Floor ring (world space, under the console) */}
      <mesh material={ringMaterial} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>

      {/* Holographic projection above the console, facing the same way as its screen */}
      <group position={station.position3D} rotation={station.rotation3D}>
        <mesh material={holoMaterial} position={[0, 1.48, -0.12]} rotation={[-0.08, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[1.35, 0.6]} />
        </mesh>
      </group>
    </group>
  );
};
