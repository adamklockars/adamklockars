// Game logic for "Dam Level" — a homage to the infamous underwater dam stage
// from the 1989 TMNT NES game: swim with floaty water physics, defuse every
// bomb before the timer blows the dam, and weave through deadly electric
// seaweed. You get four turtles. The seaweed will take most of them — and
// finishing the dam with one turtle left to beat the rest of the game is, of
// course, the whole point.

export const VIRT = { W: 480, H: 360 } as const;

export const TURTLE = { W: 18, H: 16 } as const;
export const TURTLES_START = 4;
export const TIME_START = 75; // seconds on the bomb timer

// Floaty water movement.
const ACCEL = 560; // px/s² while a direction is held
const DRAG = 3.2; // water resistance (low = floaty momentum)
const MAX_SPEED = 155;
const CURRENT_X = 34; // constant drift — you're always fighting the current
const CURRENT_Y = 20;

const RESPAWN_INVULN = 1.6; // seconds of safety after losing a turtle

const START = { x: 18, y: 168 };

export type Rect = { x: number; y: number; w: number; h: number };
export type Seaweed = Rect & { phase: number };
export type Bomb = { x: number; y: number; defused: boolean };
export type Status = "playing" | "win" | "lose";
export type LoseCause = "" | "time" | "dead";

// --- Fixed level layout (hand-designed so it's always solvable) -----------
// Gray dam walls with gaps; the gaps and chambers all hold electric seaweed.
export const WALLS: Rect[] = [
  { x: 150, y: 0, w: 16, h: 120 },
  { x: 150, y: 180, w: 16, h: 180 }, // gap y120..180
  { x: 320, y: 0, w: 16, h: 200 },
  { x: 320, y: 270, w: 16, h: 90 }, // gap y200..270
];

export const SEAWEEDS: Seaweed[] = [
  { x: 90, y: 0, w: 8, h: 150, phase: 0.0 },
  { x: 112, y: 230, w: 8, h: 130, phase: 1.2 },
  { x: 240, y: 0, w: 8, h: 120, phase: 0.6 },
  { x: 210, y: 200, w: 8, h: 160, phase: 1.8 },
  { x: 392, y: 0, w: 8, h: 160, phase: 0.3 },
  { x: 420, y: 200, w: 8, h: 160, phase: 1.5 },
  { x: 156, y: 120, w: 8, h: 60, phase: 0.9 }, // in wall-A gap
  { x: 326, y: 200, w: 8, h: 70, phase: 0.4 }, // in wall-B gap
];

const BOMB_SPOTS: { x: number; y: number }[] = [
  { x: 44, y: 60 },
  { x: 60, y: 305 },
  { x: 200, y: 60 },
  { x: 232, y: 145 },
  { x: 250, y: 310 },
  { x: 380, y: 90 },
  { x: 404, y: 184 },
  { x: 432, y: 300 },
];

// Electric seaweed cycle: mostly safe, brief warning, then a deadly zap.
const SW_CYCLE = 2.4;
const SW_WARN = 1.6;
const SW_ZAP = 1.95;
/** 0 = safe, 1 = warning (about to zap), 2 = zapping (deadly). */
export function seaweedState(time: number, sw: Seaweed): 0 | 1 | 2 {
  const t = (time + sw.phase * 0.83) % SW_CYCLE;
  if (t < SW_WARN) return 0;
  if (t < SW_ZAP) return 1;
  return 2;
}

export type Input = { up: boolean; down: boolean; left: boolean; right: boolean };

export type Game = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1; // last horizontal heading, for drawing
  bombs: Bomb[];
  turtles: number; // turtles remaining (current one included)
  time: number;
  status: Status;
  cause: LoseCause;
  invuln: number;
  gameTime: number; // drives seaweed pulsing
  flash: number; // brief red flash timer on a death
};

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  b: Rect,
): boolean {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

export function createGame(): Game {
  return {
    x: START.x,
    y: START.y,
    vx: 0,
    vy: 0,
    facing: 1,
    bombs: BOMB_SPOTS.map((s) => ({ x: s.x, y: s.y, defused: false })),
    turtles: TURTLES_START,
    time: TIME_START,
    status: "playing",
    cause: "",
    invuln: RESPAWN_INVULN,
    gameTime: 0,
    flash: 0,
  };
}

export const bombsLeft = (g: Game) => g.bombs.filter((b) => !b.defused).length;

function respawn(g: Game) {
  g.x = START.x;
  g.y = START.y;
  g.vx = 0;
  g.vy = 0;
  g.invuln = RESPAWN_INVULN;
}

function killTurtle(g: Game) {
  g.turtles -= 1;
  g.flash = 0.25;
  if (g.turtles <= 0) {
    g.turtles = 0;
    g.status = "lose";
    g.cause = "dead";
  } else {
    respawn(g);
  }
}

export function updateGame(g: Game, dt: number, input: Input): Game {
  if (g.status !== "playing") return g;

  g.gameTime += dt;
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt);
  if (g.invuln > 0) g.invuln = Math.max(0, g.invuln - dt);

  // Movement: held direction + current, with floaty drag.
  const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  g.vx += (ix * ACCEL + CURRENT_X) * dt;
  g.vy += (iy * ACCEL + CURRENT_Y) * dt;
  const dragF = 1 / (1 + DRAG * dt);
  g.vx *= dragF;
  g.vy *= dragF;
  const sp = Math.hypot(g.vx, g.vy);
  if (sp > MAX_SPEED) {
    g.vx = (g.vx / sp) * MAX_SPEED;
    g.vy = (g.vy / sp) * MAX_SPEED;
  }
  if (ix !== 0) g.facing = ix > 0 ? 1 : -1;

  // Integrate + resolve, one axis at a time so wall sliding feels right.
  g.x += g.vx * dt;
  if (g.x < 0) {
    g.x = 0;
    g.vx = 0;
  }
  if (g.x > VIRT.W - TURTLE.W) {
    g.x = VIRT.W - TURTLE.W;
    g.vx = 0;
  }
  for (const w of WALLS) {
    if (overlaps(g.x, g.y, TURTLE.W, TURTLE.H, w)) {
      if (g.vx > 0) g.x = w.x - TURTLE.W;
      else if (g.vx < 0) g.x = w.x + w.w;
      g.vx = 0;
    }
  }
  g.y += g.vy * dt;
  if (g.y < 0) {
    g.y = 0;
    g.vy = 0;
  }
  if (g.y > VIRT.H - TURTLE.H) {
    g.y = VIRT.H - TURTLE.H;
    g.vy = 0;
  }
  for (const w of WALLS) {
    if (overlaps(g.x, g.y, TURTLE.W, TURTLE.H, w)) {
      if (g.vy > 0) g.y = w.y - TURTLE.H;
      else if (g.vy < 0) g.y = w.y + w.h;
      g.vy = 0;
    }
  }

  // Electric seaweed (deadly only mid-zap; harmless while invulnerable).
  if (g.invuln <= 0) {
    for (const sw of SEAWEEDS) {
      if (
        seaweedState(g.gameTime, sw) === 2 &&
        overlaps(g.x, g.y, TURTLE.W, TURTLE.H, sw)
      ) {
        killTurtle(g);
        break;
      }
    }
  }
  if (g.status !== "playing") return g;

  // Defuse bombs on contact.
  for (const b of g.bombs) {
    if (b.defused) continue;
    if (overlaps(g.x, g.y, TURTLE.W, TURTLE.H, { x: b.x - 8, y: b.y - 8, w: 16, h: 16 })) {
      b.defused = true;
    }
  }
  if (bombsLeft(g) === 0) {
    g.status = "win";
    return g;
  }

  // The bomb timer.
  g.time -= dt;
  if (g.time <= 0) {
    g.time = 0;
    g.status = "lose";
    g.cause = "time";
  }
  return g;
}

/** A cheeky end-of-run line. */
export function endMessage(g: Game): string {
  if (g.status === "win") {
    if (g.turtles >= 4) return "Not a scratch. Suspicious.";
    if (g.turtles === 3) return "Down a turtle already. The dam's just warming up.";
    if (g.turtles === 2) return "Two turtles left. The seaweed ate the rest.";
    return "One turtle left to beat the ENTIRE rest of the game. Classic.";
  }
  if (g.cause === "time") return "💥 The dam blew. Should've swum faster.";
  return "All four turtles fried by the seaweed. The dam wins again.";
}
