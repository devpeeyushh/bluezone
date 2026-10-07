// Live, render-only view of the first-person player for the visual layers.
// Written by FirstPersonPlayer inside useFrame and read by environment layers inside their own
// useFrame, so presence effects never cause React renders. Not gameplay state: interaction,
// collision and progression keep using their own sources (playerPos / interactable registry / store).

export const playerPresence = {
  x: 0,
  z: 3.8,
  // 0..1: how strongly the facility should react to the player (0 in orbit mode / modal / unmounted)
  active: 0,
  // 0..1: current horizontal speed relative to sprint speed
  speed: 0,
};

// 0 beyond `far`, rising smoothly to 1 at `near` (distance from the player on the floor plane)
export function presenceNearness(x: number, z: number, near: number, far: number): number {
  const d = Math.hypot(playerPresence.x - x, playerPresence.z - z);
  const t = Math.min(1, Math.max(0, (far - d) / (far - near)));
  return t * t * (3 - 2 * t) * playerPresence.active;
}
