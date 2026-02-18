// ── Game Constants ──────────────────────────────────────────────
// All physics values are "per frame at 60 fps".
// The game loop multiplies by dt = clamp(delta * 60, 0, 3).

export const WORLD_SIZE = 1500;
export const ROAD_WIDTH = 14;

// Car physics
export const CAR_ACCEL     = 0.035;
export const CAR_BRAKE     = 0.03;
export const CAR_FRICTION  = 0.008;
export const CAR_MAX_SPEED = 1.2;
export const CAR_REVERSE_MAX = -0.4;
export const STEER_SPEED   = 0.028;

// Camera
export const CAM_BASE_DIST   = 14;
export const CAM_BASE_HEIGHT = 7;
export const CAM_SMOOTH      = 0.04;

// World generation
export const FLOOR_HEIGHT    = 3.5;
export const BUILDING_COUNT  = 400;
export const TREE_COUNT      = 160;
export const NPC_COUNT       = 25;
export const WORLD_BOUND     = WORLD_SIZE * 0.45;

// HUD
export const SPEED_MULT = 80;

// Shadows
export const SHADOW_CAM_SIZE = 80;

// Monster
export const MONSTER_SPEED      = 0.90;
export const MONSTER_SPAWN_DIST = 200;
export const MONSTER_HIT_DIST   = 6;

// Drift / handbrake
export const DRIFT_STEER_MULT = 2.5;
export const DRIFT_FRICTION   = 0.003;

// Road network – large city grid covering the expanded world
const W = ROAD_WIDTH;
const L = WORLD_SIZE * 0.85;   // main avenue length
const M = WORLD_SIZE * 0.6;    // medium road length
const S = 280;                  // short connector length

export const ROAD_DEFS = [
  // ── Main avenues (full-length cross) ──
  { x:    0, z:    0, w: W,  d: L },          // N–S centre
  { x:    0, z:    0, w: L,  d: W },          // E–W centre

  // ── Parallel N–S avenues ──
  { x:  200, z:    0, w: W,  d: L },
  { x: -200, z:    0, w: W,  d: L },
  { x:  400, z:    0, w: W,  d: M },
  { x: -400, z:    0, w: W,  d: M },

  // ── Parallel E–W avenues ──
  { x:    0, z:  200, w: L,  d: W },
  { x:    0, z: -200, w: L,  d: W },
  { x:    0, z:  400, w: M,  d: W },
  { x:    0, z: -400, w: M,  d: W },

  // ── Inner grid connectors ──
  { x:  100, z:  100, w: W,  d: S },
  { x:  100, z:  100, w: S,  d: W },
  { x: -100, z:  100, w: W,  d: S },
  { x: -100, z:  100, w: S,  d: W },
  { x:  100, z: -100, w: W,  d: S },
  { x:  100, z: -100, w: S,  d: W },
  { x: -100, z: -100, w: W,  d: S },
  { x: -100, z: -100, w: S,  d: W },

  // ── Outer ring connectors ──
  { x:  300, z:  200, w: W,  d: S },
  { x:  300, z: -200, w: W,  d: S },
  { x: -300, z:  200, w: W,  d: S },
  { x: -300, z: -200, w: W,  d: S },
  { x:  200, z:  300, w: S,  d: W },
  { x: -200, z:  300, w: S,  d: W },
  { x:  200, z: -300, w: S,  d: W },
  { x: -200, z: -300, w: S,  d: W },

  // ── Diagonal-ish connectors (short) ──
  { x:  300, z:    0, w: W,  d: S },
  { x: -300, z:    0, w: W,  d: S },
  { x:    0, z:  300, w: S,  d: W },
  { x:    0, z: -300, w: S,  d: W },
];

// Intersection centres (where roads cross – used for traffic lights)
export const INTERSECTIONS = [
  // centre
  { x:    0, z:    0 },
  // main avenue crossings
  { x:  200, z:    0 }, { x: -200, z:    0 },
  { x:    0, z:  200 }, { x:    0, z: -200 },
  { x:  200, z:  200 }, { x: -200, z:  200 },
  { x:  200, z: -200 }, { x: -200, z: -200 },
  // inner grid
  { x:  100, z:  100 }, { x: -100, z:  100 },
  { x:  100, z: -100 }, { x: -100, z: -100 },
  // outer
  { x:  400, z:    0 }, { x: -400, z:    0 },
  { x:    0, z:  400 }, { x:    0, z: -400 },
  { x:  300, z:  200 }, { x:  300, z: -200 },
  { x: -300, z:  200 }, { x: -300, z: -200 },
];

// Helper – is position on / near a road?
export function isOnRoad(x, z) {
  return ROAD_DEFS.some(
    r => Math.abs(x - r.x) < (r.w / 2 + 5) && Math.abs(z - r.z) < (r.d / 2 + 5)
  );
}
