"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LOOK_TARGETS, worldState } from "./worldState";

// Drives the render-only world state once per frame (renders nothing):
//  - boot ramp (entry wake-up / exit shutdown)
//  - look weights: how directly the camera faces each station / the board (visual reactions only;
//    interaction still goes exclusively through the existing [E] proximity system)

const LOOK_OUTER = Math.cos(THREE.MathUtils.degToRad(24));
const LOOK_INNER = Math.cos(THREE.MathUtils.degToRad(7));
const LOOK_RANGE = 14;
const _fwd = new THREE.Vector3();

export const WorldDirector: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const camera = useThree((s) => s.camera);

  // Every entry starts dark and wakes up; control is available immediately
  useEffect(() => {
    worldState.boot = 0;
    worldState.bootTarget = 1;
    worldState.look.fill(0);
  }, []);
  useEffect(() => {
    if (worldState.bootTarget === 1) worldState.bootRate = reducedMotion ? 3 : 0.5;
  }, [reducedMotion]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const step = worldState.bootRate * dt;
    worldState.boot += Math.max(-step, Math.min(step, worldState.bootTarget - worldState.boot));

    camera.getWorldDirection(_fwd);
    const k = 1 - Math.exp(-4 * dt);
    for (let i = 0; i < LOOK_TARGETS.length; i++) {
      const t = LOOK_TARGETS[i];
      const dx = t.x - camera.position.x;
      const dy = t.y - camera.position.y;
      const dz = t.z - camera.position.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const c = (dx * _fwd.x + dy * _fwd.y + dz * _fwd.z) / d;
      const u = Math.min(1, Math.max(0, (c - LOOK_OUTER) / (LOOK_INNER - LOOK_OUTER)));
      const target = u * u * (3 - 2 * u) * Math.max(0, 1 - d / LOOK_RANGE);
      worldState.look[i] += (target - worldState.look[i]) * k;
    }
  });

  return null;
};
