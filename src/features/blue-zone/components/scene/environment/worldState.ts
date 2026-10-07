// Render-only world state shared by the environment layers (no React state, no gameplay meaning).
// Written once per frame by WorldDirector; read by layers inside their own useFrame.
//  - boot: 0 → 1 "systems waking up" on entry (never blocks control); eased back to 0 on exit
//  - look: how directly the camera faces each look target (0..1, smoothed)

import { RADIO_STATIONS } from "../../../data/mockRadioData";

export const BOARD_LOOK_ID = "investigation-board";

// Look targets: each station's projection height, and the Investigation Board
export const LOOK_TARGETS: { id: string; x: number; y: number; z: number }[] = [
  ...RADIO_STATIONS.map((s) => ({ id: s.id as string, x: s.position3D[0], y: s.position3D[1] + 1.0, z: s.position3D[2] })),
  { id: BOARD_LOOK_ID, x: 0, y: 2.5, z: -5.75 },
];

const LOOK_INDEX: Record<string, number> = Object.fromEntries(LOOK_TARGETS.map((t, i) => [t.id, i]));

export const worldState = {
  boot: 0,
  bootTarget: 1,
  bootRate: 0.5, // per second (≈2 s wake-up); faster under reduced motion
  look: new Float32Array(LOOK_TARGETS.length),
};

export function lookAt(id: string): number {
  const i = LOOK_INDEX[id];
  return i === undefined ? 0 : worldState.look[i];
}

// Staggered wake-up: each layer comes online over its own slice of the boot ramp
export function bootPhase(start: number, span = 0.45): number {
  const t = Math.min(1, Math.max(0, (worldState.boot - start) / span));
  return t * t * (3 - 2 * t);
}

// Begin the facility shutdown (exit). Returns the duration in seconds.
export function beginShutdown(reducedMotion: boolean): number {
  worldState.bootTarget = 0;
  worldState.bootRate = reducedMotion ? 6 : 2.6;
  return reducedMotion ? 0.15 : 0.42;
}
