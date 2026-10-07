"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { entryState, ENTER_DURATION } from "./entryState";

// Cinematic landing camera (never pointer-locked, no automatic loop).
// Parallax comes from a tiny, clamped translation of one camera while it keeps looking at a fixed
// point: near layers (the facility) shift the most, the network less, the sky almost not at all —
// real depth parallax without moving any layer individually. Entering dollies a short way toward
// the open front of the facility. Reduced motion: static camera, no dolly.

const BASE = new THREE.Vector3(8.0, 2.7, 19);
const TARGET = new THREE.Vector3(-3.6, 3.5, -2);
// Entering: move toward the facility front
const ENTER_POS = new THREE.Vector3(3.2, 2.6, 10.5);
const ENTER_TARGET = new THREE.Vector3(-0.6, 2.4, -2);
const PARALLAX_X = 0.9;
const PARALLAX_Y = 0.45;

const _pos = new THREE.Vector3();
const _target = new THREE.Vector3();

export const EntryCamera: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const camera = useThree((s) => s.camera);
  const smooth = useRef({ x: 0, y: 0, enter: 0 });

  useEffect(() => {
    camera.position.copy(BASE);
    camera.lookAt(TARGET);
  }, [camera]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const s = smooth.current;
    const k = 1 - Math.exp(-2.2 * dt);
    const px = reducedMotion ? 0 : entryState.pointerX;
    const py = reducedMotion ? 0 : entryState.pointerY;
    // Mouse left → world shifts right (camera moves left), mouse up → camera rises slightly
    s.x += (px - s.x) * k;
    s.y += (py - s.y) * k;
    if (entryState.entering && !reducedMotion) s.enter = Math.min(1, s.enter + dt / ENTER_DURATION);
    const e = s.enter * s.enter * (3 - 2 * s.enter);

    _pos.copy(BASE).lerp(ENTER_POS, e);
    _pos.x += s.x * PARALLAX_X * (1 - e);
    _pos.y += s.y * PARALLAX_Y * (1 - e);
    _target.copy(TARGET).lerp(ENTER_TARGET, e);
    camera.position.copy(_pos);
    camera.lookAt(_target);
  });

  return null;
};
