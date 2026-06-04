// Game logic for "Hog Wild" — a Robot Unicorn Attack-style auto-runner, but
// the unicorn is a winged pig. Pure-ish module: physics, level generation and
// the passability guarantee live here; the React component only renders.
//
// Guarantee (see `verifyPassable`): the level is always clearable. Every gap
// between platforms is within a single jump's range, every step up is within a
// single jump's height, and every obstacle is short enough to clear from its
// platform — so a player who jumps at the right moments can always get through
// (the double-jump/flap and dash are bonus power, never a requirement).

export const VIRT = { W: 960, H: 540 } as const;

// Pig --------------------------------------------------------------------
export const PIG = {
  X: 220, // fixed screen x; the world scrolls past
  W: 46,
  H: 38,
} as const;

// Physics ----------------------------------------------------------------
export const GRAVITY = 2100; // px/s²
export const JUMP_V = 760; // first jump impulse
export const FLAP_V = 600; // double-jump ("flap") impulse
const RUN_BASE = 300;
const RUN_MAX = 470;
const RUN_RAMP = 1 / 90;

export const DASH_TIME = 0.3; // seconds of dash
export const DASH_COOLDOWN = 0.55;
const DASH_BOOST = 220; // extra px/s while dashing

// Level shape ------------------------------------------------------------
const TOP_MIN = 210; // highest a platform surface may sit
const TOP_MAX = 430; // lowest a platform surface may sit
const WIDTH_MIN = 150;
const WIDTH_MAX = 360;
const OBST_W = 30;
export const OBST_H = 44; // crystal height — well under jump apex, so jumpable
const OBST_MARGIN = 70; // keep obstacles clear of platform edges

export type Platform = {
  x: number;
  w: number;
  top: number;
};

export type Obstacle = {
  x: number;
  top: number; // y of the obstacle's top (sits on a platform)
  dead: boolean;
};

export type World = {
  pigY: number; // feet position
  vy: number;
  prevFeet: number; // feet y last frame (for landing detection)
  grounded: boolean;
  jumps: number; // jumps used since last grounded (0,1,2)
  dashTimer: number; // >0 while dashing
  dashCd: number; // >0 while on cooldown
  flapPhase: number; // wing animation
  distance: number;
  speed: number;
  platforms: Platform[];
  obstacles: Obstacle[];
  nextX: number; // world x to begin the next platform
  lastTop: number;
  dead: boolean;
  rng: () => number;
};

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
  return Math.min(RUN_MAX, RUN_BASE + distance * RUN_RAMP);
}

// Single-jump capabilities at a given run speed — the basis of the guarantee.
function jumpApex(): number {
  return (JUMP_V * JUMP_V) / (2 * GRAVITY); // ~138px
}
function jumpAirTime(): number {
  return (2 * JUMP_V) / GRAVITY; // time to return to launch height
}
// Max horizontal gap we'll ever create: a fraction of the single-jump range so
// there's comfortable take-off/landing margin (double-jump gives even more).
function maxGap(speed: number): number {
  return clamp(jumpAirTime() * speed * 0.5, 90, 190);
}
// Max upward step between platforms: a fraction of the single-jump apex.
function maxRise(): number {
  return jumpApex() * 0.6; // ~83px
}

export function createWorld(seed = (Math.random() * 1e9) | 0): World {
  const startTop = 360;
  const w: World = {
    pigY: startTop,
    vy: 0,
    prevFeet: startTop,
    grounded: true,
    jumps: 0,
    dashTimer: 0,
    dashCd: 0,
    flapPhase: 0,
    distance: 0,
    speed: RUN_BASE,
    platforms: [{ x: 0, w: PIG.X + 260, top: startTop }],
    obstacles: [],
    nextX: PIG.X + 260,
    lastTop: startTop,
    dead: false,
    rng: mulberry32(seed),
  };
  generateAhead(w);
  return w;
}

function generateAhead(w: World) {
  while (w.nextX < VIRT.W + WIDTH_MAX) {
    // Gap before this platform (the first generated one butts against start).
    const gap =
      w.platforms.length === 0
        ? 0
        : Math.round(80 + w.rng() * (maxGap(w.speed) - 80));
    const x = w.nextX + gap;

    // Surface height: drift within a single jump's reach of the previous one.
    const rise = maxRise();
    const lo = clamp(w.lastTop - rise, TOP_MIN, TOP_MAX); // higher (smaller y)
    const hi = clamp(w.lastTop + 150, TOP_MIN, TOP_MAX); // lower (drops are easy)
    const top = Math.round(lo + w.rng() * (hi - lo));

    const width = Math.round(WIDTH_MIN + w.rng() * (WIDTH_MAX - WIDTH_MIN));
    w.platforms.push({ x, w: width, top });

    // Maybe drop a crystal on a wide platform, clear of both edges so it can
    // always be jumped over (apex >> OBST_H) and there's room to land.
    if (width > OBST_W + OBST_MARGIN * 2 && w.rng() < 0.55) {
      const ox =
        x + OBST_MARGIN + w.rng() * (width - OBST_W - OBST_MARGIN * 2);
      w.obstacles.push({ x: ox, top: top - OBST_H, dead: false });
    }

    w.lastTop = top;
    w.nextX = x + width;
  }
}

/** The platform currently under the pig's feet (covering PIG.X), if any. */
function groundUnderPig(w: World): Platform | null {
  let best: Platform | null = null;
  for (const p of w.platforms) {
    if (PIG.X >= p.x && PIG.X <= p.x + p.w) {
      // Prefer the surface at/just below the feet (can't stand on one above us).
      if (w.pigY <= p.top + 2 && (best === null || p.top < best.top)) best = p;
    }
  }
  return best;
}

export function jump(w: World) {
  if (w.dead) return;
  if (w.grounded) {
    w.vy = -JUMP_V;
    w.grounded = false;
    w.jumps = 1;
  } else if (w.jumps < 2) {
    w.vy = -FLAP_V; // flap the wings
    w.jumps = 2;
    w.flapPhase = 0;
  }
}

export function dash(w: World) {
  if (w.dead || w.dashCd > 0 || w.dashTimer > 0) return;
  w.dashTimer = DASH_TIME;
  w.dashCd = DASH_TIME + DASH_COOLDOWN;
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

/** Advance the world by `dt` seconds. Mutates and returns the same object. */
export function updateWorld(w: World, dt: number): World {
  if (w.dead) return w;

  // Timers.
  if (w.dashTimer > 0) w.dashTimer = Math.max(0, w.dashTimer - dt);
  if (w.dashCd > 0) w.dashCd = Math.max(0, w.dashCd - dt);
  w.flapPhase += dt * (w.grounded ? 14 : 20);

  // Scroll speed (+ dash boost).
  w.speed = speedAt(w.distance);
  const dx = (w.speed + (w.dashTimer > 0 ? DASH_BOOST : 0)) * dt;
  w.distance += dx;

  for (const p of w.platforms) p.x -= dx;
  for (const o of w.obstacles) o.x -= dx;
  w.nextX -= dx;

  w.platforms = w.platforms.filter((p) => p.x + p.w > -60);
  w.obstacles = w.obstacles.filter((o) => o.x > -60 && !o.dead);
  generateAhead(w);

  // Vertical physics.
  w.prevFeet = w.pigY;
  w.vy += GRAVITY * dt;
  w.pigY += w.vy * dt;

  // Landing: if falling and we crossed a platform surface that's under us.
  if (w.vy >= 0) {
    let landed: Platform | null = null;
    for (const p of w.platforms) {
      if (PIG.X < p.x || PIG.X > p.x + p.w) continue;
      if (w.prevFeet <= p.top + 1 && w.pigY >= p.top) {
        if (landed === null || p.top < landed.top) landed = p;
      }
    }
    if (landed) {
      w.pigY = landed.top;
      w.vy = 0;
      w.grounded = true;
      w.jumps = 0;
    } else {
      w.grounded = false;
    }
  } else {
    w.grounded = false;
  }

  // Walked off the edge of the platform we were standing on?
  if (w.grounded && groundUnderPig(w) === null) {
    w.grounded = false;
  }

  // Fell into a gap.
  if (w.pigY > VIRT.H + 40) {
    w.dead = true;
    return w;
  }

  // Obstacle collisions.
  const px = PIG.X - PIG.W / 2;
  const py = w.pigY - PIG.H;
  for (const o of w.obstacles) {
    if (o.dead) continue;
    if (rectsOverlap(px, py, PIG.W, PIG.H, o.x, o.top, OBST_W, OBST_H)) {
      if (w.dashTimer > 0) o.dead = true; // smash through while dashing
      else {
        w.dead = true;
        break;
      }
    }
  }

  return w;
}

export function scoreOf(w: World): number {
  return Math.floor(w.distance / 10);
}

// --- Guarantee check (dev self-test, not the hot loop) --------------------
// Verifies every gap is within a single jump and every up-step within a single
// jump's apex, and that obstacles are short enough to clear and set back from
// platform edges. If all hold, the level is always clearable.
export function verifyPassable(w: World): boolean {
  const apex = jumpApex();
  const sorted = [...w.platforms].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gap = cur.x - (prev.x + prev.w);
    if (gap > maxGap(w.speed) + 1) return false;
    const rise = prev.top - cur.top; // positive = stepping up
    if (rise > maxRise() + 1) return false;
  }
  for (const o of w.obstacles) {
    if (OBST_H > apex) return false; // must be jumpable from the platform
    const p = sorted.find((pl) => o.x >= pl.x && o.x + OBST_W <= pl.x + pl.w);
    if (!p) return false; // obstacle not fully on a platform
    if (o.x < p.x + OBST_MARGIN - 1) return false; // room to take off / land
  }
  return true;
}
