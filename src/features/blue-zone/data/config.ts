// Centralized configuration for Blue Zone Phase 4

export const BLUE_ZONE_CONFIG = {
  // Session time limit in seconds (default 30 minutes = 1800 seconds)
  // Can be configured from here cleanly.
  SESSION_TIME_LIMIT_SECONDS: 1800,

  // Player movement settings
  PLAYER: {
    MOVE_SPEED: 4.2,
    SPRINT_MULTIPLIER: 1.5,
    EYE_HEIGHT: 1.6,
    COLLISION_RADIUS: 0.45,
    INTERACTION_DISTANCE: 2.8,
    INITIAL_POSITION: [0, 1.6, 3.8] as [number, number, number],
    INITIAL_LOOK: [0, 0, -1] as [number, number, number],
  },

  // Room bounds: X matches the inner faces of the side walls in RoomGeometry (walls at x=±6, 0.4 thick)
  ROOM_BOUNDS: {
    MIN_X: -5.8,
    MAX_X: 5.8,
    MIN_Z: -5.4,
    MAX_Z: 6.8,
  },

  // Obstacle collision boxes [minX, minZ, maxX, maxZ] to prevent walking through consoles/racks
  OBSTACLES: [
    // Center main console (Terminal)
    [-1.8, -3.4, 1.8, -1.6],
    // Voice archive console (Left)
    [-4.1, -1.8, -2.3, -0.2],
    // Signal monitor console (Left rear)
    [-3.8, 0.9, -1.8, 2.7],
    // Network map console (Right)
    [2.3, -1.8, 4.1, -0.2],
    // Emergency broadcast console (Right rear)
    [1.8, 0.9, 3.8, 2.7],
    // Left server racks
    [-5.8, -5.6, -3.8, -4.0],
    // Right server racks
    [3.8, -5.6, 5.8, -4.0],
    // Investigation board back wall terminal area
    [-2.2, -5.8, 2.2, -5.0],
  ] as [number, number, number, number][],
};
