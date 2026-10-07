// Listener pose for stereo panning, written by the in-canvas FacilityAudio component (no React state).
// panFor() returns -1 (left) .. 1 (right) for a floor position relative to where the camera faces.

export const audioListener = { x: 0, z: 3.8, rightX: 1, rightZ: 0 };

export function panFor(x: number, z: number): number {
  const dx = x - audioListener.x;
  const dz = z - audioListener.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.001) return 0;
  return Math.max(-1, Math.min(1, (dx * audioListener.rightX + dz * audioListener.rightZ) / d));
}

// Investigation Board (back wall, centre)
export const BOARD_AUDIO_POSITION: [number, number] = [0, -5.75];
