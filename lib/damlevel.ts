// Game logic for "The Damn Level" — a homage to the infamous underwater dam
// stage from the 1989 TMNT NES game, only with platypuses. The world is a
// large scrolling maze (the camera follows you in all four directions); swim
// the floaty current, defuse every bomb before the timer blows the dam, and
// weave through deadly electric seaweed. You get four platypuses. The seaweed
// will take most of them.

// The whole level — bigger than the viewport, so the camera scrolls.
export const WORLD = { W: 960, H: 720 } as const;

export const PLATY = { W: 18, H: 14 } as const;
export const PLATYPUS_START = 4;
export const TIME_START = 80; // seconds on the bomb timer

// Floaty water movement (a touch floatier + stronger current than before).
const ACCEL = 560;
const DRAG = 3.0;
const MAX_SPEED = 168;
const CURRENT_X = 40;
const CURRENT_Y = 26;

const RESPAWN_INVULN = 1.4;
const START = { x: 24, y: 338 };

export type Rect = { x: number; y: number; w: number; h: number };
export type Seaweed = Rect & { phase: number };
export type Bomb = { x: number; y: number; defused: boolean };
export type Status = "playing" | "win" | "lose";
export type LoseCause = "" | "time" | "dead";

// --- Fixed maze layout (vertical dam walls w/ gaps → always solvable) ------
export const WALLS: Rect[] = [
  { x: 188, y: 0, w: 16, h: 120 }, { x: 188, y: 210, w: 16, h: 510 }, // gap 120..210
  { x: 380, y: 0, w: 16, h: 470 }, { x: 380, y: 560, w: 16, h: 160 }, // gap 470..560
  { x: 572, y: 0, w: 16, h: 230 }, { x: 572, y: 320, w: 16, h: 400 }, // gap 230..320
  { x: 764, y: 0, w: 16, h: 430 }, { x: 764, y: 520, w: 16, h: 200 }, // gap 430..520
];

export const SEAWEEDS: Seaweed[] = [
  { x: 90, y: 0, w: 8, h: 300, phase: 0.0 },
  { x: 120, y: 380, w: 8, h: 340, phase: 1.1 },
  { x: 194, y: 120, w: 8, h: 90, phase: 0.6 }, // wall-1 gap
  { x: 280, y: 0, w: 8, h: 240, phase: 0.9 },
  { x: 300, y: 330, w: 8, h: 390, phase: 1.6 },
  { x: 386, y: 470, w: 8, h: 90, phase: 0.3 }, // wall-2 gap
  { x: 470, y: 0, w: 8, h: 200, phase: 1.3 },
  { x: 500, y: 260, w: 8, h: 460, phase: 0.5 },
  { x: 578, y: 230, w: 8, h: 90, phase: 1.0 }, // wall-3 gap
  { x: 660, y: 0, w: 8, h: 380, phase: 0.4 },
  { x: 690, y: 470, w: 8, h: 250, phase: 1.8 },
  { x: 770, y: 430, w: 8, h: 90, phase: 0.7 }, // wall-4 gap
  { x: 850, y: 0, w: 8, h: 300, phase: 1.2 },
  { x: 880, y: 380, w: 8, h: 340, phase: 0.2 },
  { x: 820, y: 330, w: 8, h: 120, phase: 1.5 },
];

const BOMB_SPOTS: { x: number; y: number }[] = [
  { x: 60, y: 60 }, { x: 70, y: 420 }, { x: 140, y: 650 },
  { x: 300, y: 140 }, { x: 330, y: 640 },
  { x: 470, y: 400 }, { x: 520, y: 120 }, { x: 540, y: 650 },
  { x: 660, y: 200 }, { x: 700, y: 560 },
  { x: 860, y: 150 }, { x: 900, y: 640 },
];

// Electric seaweed cycle — harder: longer deadly window, shorter warning.
const SW_CYCLE = 2.0;
const SW_WARN = 1.2;
const SW_ZAP = 1.45;
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
  facing: 1 | -1;
  bombs: Bomb[];
  platypuses: number;
  time: number;
  status: Status;
  cause: LoseCause;
  invuln: number;
  gameTime: number;
  flash: number;
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
    platypuses: PLATYPUS_START,
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

function killPlatypus(g: Game) {
  g.platypuses -= 1;
  g.flash = 0.25;
  if (g.platypuses <= 0) {
    g.platypuses = 0;
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

  // Integrate + resolve, one axis at a time.
  g.x += g.vx * dt;
  if (g.x < 0) { g.x = 0; g.vx = 0; }
  if (g.x > WORLD.W - PLATY.W) { g.x = WORLD.W - PLATY.W; g.vx = 0; }
  for (const w of WALLS) {
    if (overlaps(g.x, g.y, PLATY.W, PLATY.H, w)) {
      if (g.vx > 0) g.x = w.x - PLATY.W;
      else if (g.vx < 0) g.x = w.x + w.w;
      g.vx = 0;
    }
  }
  g.y += g.vy * dt;
  if (g.y < 0) { g.y = 0; g.vy = 0; }
  if (g.y > WORLD.H - PLATY.H) { g.y = WORLD.H - PLATY.H; g.vy = 0; }
  for (const w of WALLS) {
    if (overlaps(g.x, g.y, PLATY.W, PLATY.H, w)) {
      if (g.vy > 0) g.y = w.y - PLATY.H;
      else if (g.vy < 0) g.y = w.y + w.h;
      g.vy = 0;
    }
  }

  // Electric seaweed.
  if (g.invuln <= 0) {
    for (const sw of SEAWEEDS) {
      if (seaweedState(g.gameTime, sw) === 2 && overlaps(g.x, g.y, PLATY.W, PLATY.H, sw)) {
        killPlatypus(g);
        break;
      }
    }
  }
  if (g.status !== "playing") return g;

  // Defuse bombs.
  for (const b of g.bombs) {
    if (b.defused) continue;
    if (overlaps(g.x, g.y, PLATY.W, PLATY.H, { x: b.x - 8, y: b.y - 8, w: 16, h: 16 })) {
      b.defused = true;
    }
  }
  if (bombsLeft(g) === 0) {
    g.status = "win";
    return g;
  }

  g.time -= dt;
  if (g.time <= 0) {
    g.time = 0;
    g.status = "lose";
    g.cause = "time";
  }
  return g;
}

export function endMessage(g: Game): string {
  if (g.status === "win") {
    if (g.platypuses >= 4) return "Not a scratch. Suspicious.";
    if (g.platypuses === 3) return "Down a platypus already. The dam's just warming up.";
    if (g.platypuses === 2) return "Two platypuses left. The seaweed ate the rest.";
    return "One platypus left to beat the ENTIRE rest of the game. Classic.";
  }
  if (g.cause === "time") return "💥 The dam blew. Should've swum faster.";
  return "All four platypuses fried by the seaweed. The damn level wins again.";
}
