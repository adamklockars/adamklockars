// Game logic for the retro side-scroller — a rebuild of the old Turing
// spaceship game from the original site. Pure-ish module: all the rules,
// generation, and physics live here so the React component is just a renderer.
//
// The headline invariant (see `verifyPassable`): there is ALWAYS a continuous,
// physically-reachable path through the level. We achieve this with a "safe
// corridor" — a band of fixed height `GAP` whose centre drifts slowly. Every
// wall's opening is aligned to that band, and every alien is kept fully outside
// it, so the corridor is never blocked and the ship can always thread through.

// Fixed virtual coordinate space; the renderer scales this to the canvas.
export const VIRT = { W: 960, H: 540 } as const;

// Ship --------------------------------------------------------------------
export const SHIP = {
  X: 170, // fixed horizontal position; the world scrolls past it
  W: 42,
  H: 24,
  SPEED: 300, // px/s vertical travel while a key is held
} as const;

// Walls -------------------------------------------------------------------
export const WALL_W = 48; // thickness of each vertical barrier
export const SPACING = 320; // centre-to-centre distance between walls
export const GAP = 170; // height of the opening (== safe-corridor height)

// The corridor centre is clamped so that an alien parked just outside the
// band (on either side) still fits fully on-screen — keeps the guarantee
// visually honest as well as logically true.
export const ALIEN_R = 16;
const ALIEN_OFFSET = GAP / 2 + ALIEN_R + 12; // band edge → alien centre
export const CORRIDOR_MIN = ALIEN_OFFSET + ALIEN_R; // 405 → top room for a low alien
export const CORRIDOR_MAX = VIRT.H - (ALIEN_OFFSET + ALIEN_R);

// Difficulty: scroll speed ramps with distance, capped.
const SPEED_BASE = 190;
const SPEED_MAX = 360;
const SPEED_RAMP = 1 / 70; // +1 px/s of speed per 70px travelled

// Aliens spawn on a timer that tightens slightly as you go.
const ALIEN_INTERVAL_START = 2.0; // seconds
const ALIEN_INTERVAL_MIN = 0.95;
const ALIEN_ENTRY = 0.45; // seconds for the "drop in" animation

export type Wall = {
  x: number; // world x of the wall's left edge
  center: number; // corridor centre at this wall (== gap centre)
  scored: boolean;
};

export type Alien = {
  x: number;
  offset: number; // signed distance from corridor centre (kept outside the band)
  entry: number; // 0→1 entry animation progress
  fromY: number; // off-screen y the alien eases in from
  wobble: number; // phase for a little idle bob
};

export type World = {
  shipY: number;
  vy: number;
  distance: number; // total px scrolled — drives score & difficulty
  speed: number;
  walls: Wall[];
  aliens: Alien[];
  nextWallX: number; // world x at which to place the next wall
  lastCenter: number;
  alienTimer: number;
  dead: boolean;
  rng: () => number;
};

export type Input = { up: boolean; down: boolean };

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// Small seeded PRNG (mulberry32) so levels are deterministic and the
// passability guarantee is reproducible/testable.
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

// How far the corridor centre may shift between two consecutive walls.
// Bounded by BOTH (a) what the ship can climb/descend over that horizontal
// span — guaranteeing reachability — and (b) leaving the gaps overlapping by
// at least a ship-height, which keeps the threading comfortable.
function maxCenterDelta(speed: number): number {
  const reach = SHIP.SPEED * (SPACING / speed); // px the ship can move per wall
  const overlap = GAP - SHIP.H - 18;
  return Math.min(0.8 * reach, overlap);
}

export function createWorld(seed = (Math.random() * 1e9) | 0): World {
  const w: World = {
    shipY: VIRT.H / 2,
    vy: 0,
    distance: 0,
    speed: SPEED_BASE,
    walls: [],
    aliens: [],
    nextWallX: VIRT.W + 120,
    lastCenter: VIRT.H / 2,
    alienTimer: ALIEN_INTERVAL_START,
    dead: false,
    rng: mulberry32(seed),
  };
  generateAhead(w);
  return w;
}

// The safe-corridor centre at any world x: linear interpolation between the
// surrounding wall centres (flat past either end). Walls' gaps are aligned to
// this, and aliens are positioned relative to it, so this single curve defines
// the always-clear path.
export function corridorCenterAt(w: World, x: number): number {
  const walls = w.walls;
  if (walls.length === 0) return VIRT.H / 2;
  if (x <= walls[0].x) return walls[0].center;
  for (let i = 0; i < walls.length - 1; i++) {
    const a = walls[i];
    const b = walls[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.center + (b.center - a.center) * t;
    }
  }
  return walls[walls.length - 1].center;
}

function generateAhead(w: World) {
  // Keep walls generated comfortably beyond the right edge.
  while (w.nextWallX < VIRT.W + SPACING * 2) {
    const delta = maxCenterDelta(w.speed);
    const center = clamp(
      w.lastCenter + (w.rng() * 2 - 1) * delta,
      CORRIDOR_MIN,
      CORRIDOR_MAX,
    );
    w.walls.push({ x: w.nextWallX, center, scored: false });
    w.lastCenter = center;
    w.nextWallX += SPACING;
  }
}

function spawnAlien(w: World) {
  const spawnX = VIRT.W + ALIEN_R;
  const center = corridorCenterAt(w, spawnX);
  // Either side of the band is provably on-screen (see CORRIDOR_MIN/MAX);
  // pick whichever has more breathing room, with a coin-flip tie-break.
  const roomAbove = center - ALIEN_OFFSET;
  const roomBelow = VIRT.H - (center + ALIEN_OFFSET);
  const above =
    roomAbove > roomBelow + 1
      ? true
      : roomBelow > roomAbove + 1
        ? false
        : w.rng() < 0.5;
  const offset = above ? -ALIEN_OFFSET : ALIEN_OFFSET;
  w.aliens.push({
    x: spawnX,
    offset,
    entry: 0,
    fromY: above ? -ALIEN_R : VIRT.H + ALIEN_R,
    wobble: w.rng() * Math.PI * 2,
  });
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** Resolved on-screen y of an alien, accounting for its entry animation. */
export function alienY(w: World, a: Alien): number {
  const laneY = corridorCenterAt(w, a.x) + a.offset;
  if (a.entry >= 1) return laneY + Math.sin(a.wobble) * 6;
  return a.fromY + (laneY - a.fromY) * easeOut(a.entry);
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function checkCollision(w: World): boolean {
  const sx = SHIP.X - SHIP.W / 2;
  const sy = w.shipY - SHIP.H / 2;

  for (const wall of w.walls) {
    if (wall.x + WALL_W < sx || wall.x > sx + SHIP.W) continue;
    const gapTop = wall.center - GAP / 2;
    const gapBot = wall.center + GAP / 2;
    // Hit the top slab or the bottom slab of the wall?
    if (sy < gapTop || sy + SHIP.H > gapBot) return true;
  }

  for (const a of w.aliens) {
    const ay = alienY(w, a);
    // Treat the alien as a square for collision; shrink a touch to feel fair.
    const r = ALIEN_R - 3;
    if (
      rectsOverlap(sx, sy, SHIP.W, SHIP.H, a.x - r, ay - r, r * 2, r * 2)
    ) {
      return true;
    }
  }
  return false;
}

/** Advance the world by `dt` seconds. Mutates and returns the same object. */
export function updateWorld(w: World, dt: number, input: Input): World {
  if (w.dead) return w;

  w.speed = speedAt(w.distance);
  const dx = w.speed * dt;
  w.distance += dx;

  // Scroll the world left.
  for (const wall of w.walls) wall.x -= dx;
  for (const a of w.aliens) a.x -= dx;
  w.nextWallX -= dx;

  // Retire off-screen obstacles, then top up ahead.
  w.walls = w.walls.filter((wall) => wall.x + WALL_W > -40);
  w.aliens = w.aliens.filter((a) => a.x + ALIEN_R > -40);
  generateAhead(w);

  // Aliens: progress entry + idle bob.
  for (const a of w.aliens) {
    if (a.entry < 1) a.entry = Math.min(1, a.entry + dt / ALIEN_ENTRY);
    a.wobble += dt * 3;
  }

  // Spawn aliens on a tightening timer.
  w.alienTimer -= dt;
  if (w.alienTimer <= 0) {
    spawnAlien(w);
    const interval = Math.max(
      ALIEN_INTERVAL_MIN,
      ALIEN_INTERVAL_START - w.distance * (1 / 9000),
    );
    w.alienTimer = interval;
  }

  // Ship vertical movement (direct velocity — arcade feel, exact reach math).
  w.vy = (input.down ? 1 : 0) * SHIP.SPEED - (input.up ? 1 : 0) * SHIP.SPEED;
  w.shipY = clamp(w.shipY + w.vy * dt, SHIP.H / 2, VIRT.H - SHIP.H / 2);

  if (checkCollision(w)) w.dead = true;
  return w;
}

/** Score is distance travelled, in tens of px. */
export function scoreOf(w: World): number {
  return Math.floor(w.distance / 10);
}

// --- Guarantee check (used by the dev self-test, not the hot loop) --------
// Confirms a continuous, reachable safe corridor runs through the whole level:
//   1. every wall's gap is at least a ship tall (the ship fits through it);
//   2. consecutive gaps overlap by more than a ship height, so the corridor is
//      continuous and the next gap is always reachable from the current one;
//   3. no alien ever intrudes into that corridor band.
// If all hold, the level can never become a no-pass scenario.
export function verifyPassable(w: World): boolean {
  const walls = [...w.walls].sort((a, b) => a.x - b.x);
  for (let i = 0; i < walls.length; i++) {
    if (GAP < SHIP.H) return false; // ship must fit the gap
    if (i > 0) {
      const dc = Math.abs(walls[i].center - walls[i - 1].center);
      if (dc > GAP - SHIP.H) return false; // gaps must overlap by a ship height
    }
  }
  for (const a of w.aliens) {
    const cc = corridorCenterAt(w, a.x);
    const top = cc + a.offset - ALIEN_R;
    const bot = cc + a.offset + ALIEN_R;
    if (bot > cc - GAP / 2 && top < cc + GAP / 2) return false; // intrudes on band
  }
  return true;
}
