// Game logic for "If Then Explosion" — a rebuild of the spaceship game I first
// wrote in Turing. The original was a triangle ship flying through a scrolling
// green cave, with collision done by "looking ahead" at the colour of the
// pixels in front of the ship. This keeps that spirit: a continuous cave whose
// walls swell toward the centre to pinch the passage, aliens that squeeze the
// gap further, and look-ahead collision sampling at the ship's nose/corners.
//
// Passability guarantee (see `verifyPassable`): a clear, reachable "safe lane"
// of fixed height always runs through the level. The cave walls never close in
// past that lane, aliens are always kept just outside it, and the lane's centre
// drifts slowly enough that the ship can always follow it. So however tight it
// looks, a path always exists.

export const VIRT = { W: 960, H: 540 } as const;

// Ship — a simple right-pointing triangle (nose ahead, two tail corners).
export const SHIP = {
  X: 180, // fixed screen x; the cave scrolls past
  NOSE: 18, // nose extends this far ahead of X
  TAIL: 14, // tail sits this far behind X
  HALF_H: 11, // half the tail height (collision half-height)
  SPEED: 300, // px/s vertical travel while a key is held
} as const;

// Safe lane — the guaranteed-clear corridor the player threads.
export const SAFE_HALF = 26; // half-height of the always-clear lane (> ship)

// Aliens hug just outside the lane, in the slack between lane and wall.
export const ALIEN_R = 14;
const ALIEN_OFFSET = SAFE_HALF + ALIEN_R + 6; // lane-edge → alien centre
const ALIEN_BOB = 4; // idle bob amplitude (kept < the lane clearance)

// Cave walls. The passage half-height oscillates between PINCH (walls swollen
// toward the centre — just enough room for the lane plus a flanking alien) and
// OPEN (walls receded). It never drops below the lane.
const HALF_PINCH = SAFE_HALF + 2 * ALIEN_R + 6; // 60 — narrowest passage half
const HALF_OPEN = SAFE_HALF + 130; // 156 — widest passage half

// Lane centre wanders within this band so the full-width walls stay on screen.
const C_MID = VIRT.H / 2;
const C_MIN = HALF_OPEN + 6;
const C_MAX = VIRT.H - HALF_OPEN - 6;
// Centre wobble: amplitude/wavelength pairs. The summed max slope
// (A1/L1 + A2/L2) is bounded so the ship can always out-climb the lane.
const C_A1 = 60,
  C_L1 = 200,
  C_A2 = 26,
  C_L2 = 115;
// Passage-width wobble wavelengths.
const H_L1 = 240,
  H_L2 = 130;

// Difficulty: scroll speed ramps with distance.
const SPEED_BASE = 175;
const SPEED_MAX = 330;
const SPEED_RAMP = 1 / 80;

const ALIEN_INTERVAL_START = 1.8;
const ALIEN_INTERVAL_MIN = 0.85;
const ALIEN_ENTRY = 0.4;

export type Alien = {
  x: number; // screen x
  side: 1 | -1; // -1 above the lane, +1 below
  entry: number; // 0→1 entry animation
  wobble: number;
};

export type World = {
  shipY: number;
  vy: number;
  distance: number;
  speed: number;
  aliens: Alien[];
  alienTimer: number;
  dead: boolean;
  rng: () => number;
  // Deterministic terrain phases (seeded).
  p1: number;
  p2: number;
  p3: number;
  p4: number;
};

export type Input = { up: boolean; down: boolean };

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speedAt(distance: number): number {
  return Math.min(SPEED_MAX, SPEED_BASE + distance * SPEED_RAMP);
}

/** Centre of the safe lane (and of the cave) at a given world x. */
export function laneCenter(w: World, worldX: number): number {
  const y =
    C_MID +
    C_A1 * Math.sin(worldX / C_L1 + w.p1) +
    C_A2 * Math.sin(worldX / C_L2 + w.p2);
  return clamp(y, C_MIN, C_MAX);
}

/** Half-height of the open passage at a given world x (>= SAFE_HALF always). */
export function passageHalf(w: World, worldX: number): number {
  const t1 = 0.5 + 0.5 * Math.sin(worldX / H_L1 + w.p3);
  const t2 = 0.5 + 0.5 * Math.sin(worldX / H_L2 + w.p4);
  const m = t1 * 0.65 + t2 * 0.35; // 0..1
  return HALF_PINCH + (HALF_OPEN - HALF_PINCH) * m;
}

/** Convenience: the cave's top and bottom wall surfaces at a world x. */
export function caveBounds(w: World, worldX: number): { top: number; bottom: number } {
  const c = laneCenter(w, worldX);
  const h = passageHalf(w, worldX);
  return { top: c - h, bottom: c + h };
}

export function createWorld(seed = (Math.random() * 1e9) | 0): World {
  const rng = mulberry32(seed);
  const w: World = {
    shipY: VIRT.H / 2,
    vy: 0,
    distance: 0,
    speed: SPEED_BASE,
    aliens: [],
    alienTimer: ALIEN_INTERVAL_START,
    dead: false,
    rng,
    p1: rng() * Math.PI * 2,
    p2: rng() * Math.PI * 2,
    p3: rng() * Math.PI * 2,
    p4: rng() * Math.PI * 2,
  };
  // Start the ship on the lane centre at its own x.
  w.shipY = laneCenter(w, w.distance + SHIP.X);
  return w;
}

/** Signed offset (from the lane centre) of an alien, accounting for entry. */
function alienMagnitude(w: World, a: Alien, worldX: number): number {
  const rest = ALIEN_OFFSET + Math.sin(a.wobble) * ALIEN_BOB;
  if (a.entry >= 1) return rest;
  // Slide in from the wall surface toward its resting offset.
  const fromWall = passageHalf(w, worldX) - ALIEN_R;
  const t = 1 - (1 - a.entry) * (1 - a.entry); // ease-out
  return fromWall + (rest - fromWall) * t;
}

/** Resolved on-screen y of an alien. */
export function alienY(w: World, a: Alien): number {
  const worldX = w.distance + a.x;
  return laneCenter(w, worldX) + a.side * alienMagnitude(w, a, worldX);
}

function spawnAlien(w: World) {
  const side: 1 | -1 = w.rng() < 0.5 ? -1 : 1;
  w.aliens.push({ x: VIRT.W + ALIEN_R, side, entry: 0, wobble: w.rng() * Math.PI * 2 });
}

/** Is point (screen px, py) inside a cave wall (i.e. outside the passage)? */
function hitsWall(w: World, px: number, py: number): boolean {
  const { top, bottom } = caveBounds(w, w.distance + px);
  return py < top || py > bottom;
}

function checkCollision(w: World): boolean {
  // Look-ahead sampling at the triangle's three points (nose + two tail
  // corners) — the modern stand-in for the original's pixel-colour look-ahead.
  if (hitsWall(w, SHIP.X + SHIP.NOSE, w.shipY)) return true;
  if (hitsWall(w, SHIP.X - SHIP.TAIL, w.shipY - SHIP.HALF_H)) return true;
  if (hitsWall(w, SHIP.X - SHIP.TAIL, w.shipY + SHIP.HALF_H)) return true;

  const sx = SHIP.X - SHIP.TAIL;
  const sy = w.shipY - SHIP.HALF_H;
  const sw = SHIP.NOSE + SHIP.TAIL;
  const sh = SHIP.HALF_H * 2;
  for (const a of w.aliens) {
    const ay = alienY(w, a);
    const r = ALIEN_R - 3;
    if (sx < a.x + r && sx + sw > a.x - r && sy < ay + r && sy + sh > ay - r) {
      return true;
    }
  }
  return false;
}

/** Advance the world by `dt` seconds. Mutates and returns the same object. */
export function updateWorld(w: World, dt: number, input: Input): World {
  if (w.dead) return w;

  w.speed = speedAt(w.distance);
  w.distance += w.speed * dt;

  // Scroll aliens with the cave; retire the ones off the left edge.
  for (const a of w.aliens) {
    a.x -= w.speed * dt;
    if (a.entry < 1) a.entry = Math.min(1, a.entry + dt / ALIEN_ENTRY);
    a.wobble += dt * 3;
  }
  w.aliens = w.aliens.filter((a) => a.x > -ALIEN_R - 10);

  // Spawn on a tightening timer.
  w.alienTimer -= dt;
  if (w.alienTimer <= 0) {
    spawnAlien(w);
    w.alienTimer = Math.max(
      ALIEN_INTERVAL_MIN,
      ALIEN_INTERVAL_START - w.distance / 9000,
    );
  }

  // Ship vertical movement (direct velocity — exact reach math).
  w.vy = (input.down ? 1 : 0) * SHIP.SPEED - (input.up ? 1 : 0) * SHIP.SPEED;
  w.shipY = clamp(w.shipY + w.vy * dt, SHIP.HALF_H, VIRT.H - SHIP.HALF_H);

  if (checkCollision(w)) w.dead = true;
  return w;
}

export function scoreOf(w: World): number {
  return Math.floor(w.distance / 10);
}

// --- Guarantee check (dev self-test, not the hot loop) --------------------
// Verifies the always-clear, always-reachable safe lane:
//   1. the cave never closes in past the lane (passageHalf >= SAFE_HALF);
//   2. no alien ever intrudes into the lane (inner edge stays clear);
//   3. the lane centre's max slope is within the ship's climb rate, so the
//      ship can always keep its nose inside the lane.
// If all hold, the level can never be a no-pass scenario.
export function verifyPassable(w: World): boolean {
  // 1 & 2 sampled across the on-screen + look-ahead range.
  for (let x = -40; x <= VIRT.W + 200; x += 6) {
    if (passageHalf(w, w.distance + x) < SAFE_HALF - 1e-6) return false;
  }
  // Aliens rest just outside the lane; their nearest edge (at full bob toward
  // the lane) must still clear it. This holds for every alien by construction.
  const alienInnerEdge = ALIEN_OFFSET - ALIEN_BOB - ALIEN_R;
  if (w.aliens.length > 0 && alienInnerEdge < SAFE_HALF - 1e-6) return false;
  // 3 — bound the lane-centre slope against the ship's reach at top speed.
  const maxSlope = C_A1 / C_L1 + C_A2 / C_L2; // d(center)/d(worldX)
  const reachSlope = SHIP.SPEED / SPEED_MAX; // px climbed per px scrolled
  return maxSlope <= reachSlope * 0.85;
}
