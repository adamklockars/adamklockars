// Game logic for "The Damn Level" — a homage to the infamous underwater dam
// stage from the 1989 TMNT NES game, with platypuses. The map is a generated
// network of narrow tunnels carved through rock (a braided maze, so it's fully
// connected and always solvable). Swim the floaty current through the tunnels,
// defuse every bomb before the timer blows the dam, and weave past electric
// seaweed that gates the corridors. You get four platypuses; the seaweed will
// take most of them — and each death drops you back at the entrance.

export const TILE = 44;
export const COLS = 21; // odd → maze grid
export const ROWS = 15;
export const WORLD = { W: COLS * TILE, H: ROWS * TILE } as const; // 924 x 660

export const PLATY = { W: 18, H: 14 } as const;
export const PLATYPUS_START = 4;
export const TIME_START = 100; // seconds on the bomb timer

const BOMB_COUNT = 12;
const SEAWEED_COUNT = 14;

// Floaty water movement — controllable enough for tunnels, never still.
const ACCEL = 640;
const DRAG = 4.2;
const MAX_SPEED = 158;
const CURRENT_X = 26;
const CURRENT_Y = 16;

const RESPAWN_INVULN = 1.5;

export type Rect = { x: number; y: number; w: number; h: number };
export type Seaweed = Rect & { phase: number };
export type Bomb = { x: number; y: number; defused: boolean };
export type Status = "playing" | "win" | "lose";
export type LoseCause = "" | "time" | "dead";
export type Input = { up: boolean; down: boolean; left: boolean; right: boolean };

export type Game = {
  grid: Uint8Array; // ROWS*COLS, 1 = solid rock, 0 = tunnel
  bombs: Bomb[];
  seaweeds: Seaweed[];
  startX: number;
  startY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  platypuses: number;
  time: number;
  status: Status;
  cause: LoseCause;
  invuln: number;
  gameTime: number;
  flash: number;
};

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

export const solidAt = (g: Game, col: number, row: number): boolean =>
  col < 0 || col >= COLS || row < 0 || row >= ROWS || g.grid[row * COLS + col] === 1;

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// Carve a braided maze of tunnels and place bombs + seaweed.
function buildLevel(rand: () => number) {
  const grid = new Uint8Array(ROWS * COLS).fill(1);
  const at = (r: number, c: number) => r * COLS + c;
  const CR = (ROWS - 1) / 2; // 7 cell rows
  const CC = (COLS - 1) / 2; // 10 cell cols
  const vis = Array.from({ length: CR }, () => new Array(CC).fill(false));
  const tr = (cr: number) => 2 * cr + 1;
  const tc = (cc: number) => 2 * cc + 1;

  // Recursive backtracker (iterative).
  const stack: [number, number][] = [[0, 0]];
  vis[0][0] = true;
  grid[at(tr(0), tc(0))] = 0;
  while (stack.length) {
    const [cr, cc] = stack[stack.length - 1];
    const opts: [number, number, number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < CR && nc >= 0 && nc < CC && !vis[nr][nc]) opts.push([nr, nc, dr, dc]);
    }
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [nr, nc, dr, dc] = opts[Math.floor(rand() * opts.length)];
    vis[nr][nc] = true;
    grid[at(tr(nr), tc(nc))] = 0;
    grid[at(tr(cr) + dr, tc(cc) + dc)] = 0; // knock down the wall between
    stack.push([nr, nc]);
  }

  // Braid: open ~35% of dead-ends to create loops → an interconnected tunnel
  // system rather than a tedious perfect maze.
  for (let cr = 0; cr < CR; cr++) {
    for (let cc = 0; cc < CC; cc++) {
      const r = tr(cr), c = tc(cc);
      let open = 0;
      const walls: [number, number, number, number][] = [];
      for (const [dr, dc] of DIRS) {
        if (grid[at(r + dr, c + dc)] === 0) open++;
        else walls.push([r + dr, c + dc, dr, dc]);
      }
      if (open === 1 && rand() < 0.35) {
        const valid = walls.filter(([, , dr, dc]) => {
          const ncr = cr + dr, ncc = cc + dc;
          return ncr >= 0 && ncr < CR && ncc >= 0 && ncc < CC;
        });
        if (valid.length) {
          const [wr, wc] = valid[Math.floor(rand() * valid.length)];
          grid[at(wr, wc)] = 0;
        }
      }
    }
  }

  const shuffle = <T,>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const startR = tr(0), startC = tc(0);

  // Bombs — prefer dead-end cells (a tunnel you have to go down), then others.
  const cells: [number, number][] = [];
  for (let cr = 0; cr < CR; cr++) for (let cc = 0; cc < CC; cc++) cells.push([tr(cr), tc(cc)]);
  const openCount = (r: number, c: number) =>
    DIRS.reduce((n, [dr, dc]) => n + (grid[at(r + dr, c + dc)] === 0 ? 1 : 0), 0);
  const deadEnds = cells.filter(([r, c]) => openCount(r, c) === 1 && !(r === startR && c === startC));
  const others = cells.filter(([r, c]) => !(openCount(r, c) === 1) && !(r === startR && c === startC));
  const order = shuffle(deadEnds).concat(shuffle(others));
  const bombs: Bomb[] = [];
  for (const [r, c] of order) {
    if (bombs.length >= BOMB_COUNT) break;
    bombs.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, defused: false });
  }

  // Seaweed — gate corridors (open tiles between two cells), away from the start.
  const connectors: { r: number; c: number; vertical: boolean }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[at(r, c)] !== 0) continue;
      if (r % 2 === 1 && c % 2 === 1) continue; // skip cell centers
      const vertical = grid[at(r - 1, c)] === 0 || grid[at(r + 1, c)] === 0;
      if (Math.abs(r - startR) + Math.abs(c - startC) > 2) connectors.push({ r, c, vertical });
    }
  }
  const seaweeds: Seaweed[] = [];
  for (const k of shuffle(connectors).slice(0, SEAWEED_COUNT)) {
    const tx = k.c * TILE, ty = k.r * TILE;
    if (k.vertical) seaweeds.push({ x: tx + 4, y: ty + TILE / 2 - 5, w: TILE - 8, h: 10, phase: rand() * 2 });
    else seaweeds.push({ x: tx + TILE / 2 - 5, y: ty + 4, w: 10, h: TILE - 8, phase: rand() * 2 });
  }

  return {
    grid,
    bombs,
    seaweeds,
    startX: startC * TILE + TILE / 2 - PLATY.W / 2,
    startY: startR * TILE + TILE / 2 - PLATY.H / 2,
  };
}

export function createGame(seed?: number): Game {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const lvl = buildLevel(rand);
  return {
    grid: lvl.grid,
    bombs: lvl.bombs,
    seaweeds: lvl.seaweeds,
    startX: lvl.startX,
    startY: lvl.startY,
    x: lvl.startX,
    y: lvl.startY,
    vx: 0,
    vy: 0,
    facing: 1,
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

function overlaps(ax: number, ay: number, aw: number, ah: number, b: Rect): boolean {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

function killPlatypus(g: Game) {
  g.platypuses -= 1;
  g.flash = 0.25;
  if (g.platypuses <= 0) {
    g.platypuses = 0;
    g.status = "lose";
    g.cause = "dead";
  } else {
    g.x = g.startX;
    g.y = g.startY;
    g.vx = 0;
    g.vy = 0;
    g.invuln = RESPAWN_INVULN;
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

  // Tile collision, axis-separated.
  g.x += g.vx * dt;
  if (g.x < 0) { g.x = 0; g.vx = 0; }
  if (g.x > WORLD.W - PLATY.W) { g.x = WORLD.W - PLATY.W; g.vx = 0; }
  {
    const r0 = Math.floor(g.y / TILE), r1 = Math.floor((g.y + PLATY.H - 1) / TILE);
    if (g.vx > 0) {
      const c = Math.floor((g.x + PLATY.W - 1) / TILE);
      for (let r = r0; r <= r1; r++) if (solidAt(g, c, r)) { g.x = c * TILE - PLATY.W; g.vx = 0; break; }
    } else if (g.vx < 0) {
      const c = Math.floor(g.x / TILE);
      for (let r = r0; r <= r1; r++) if (solidAt(g, c, r)) { g.x = (c + 1) * TILE; g.vx = 0; break; }
    }
  }
  g.y += g.vy * dt;
  if (g.y < 0) { g.y = 0; g.vy = 0; }
  if (g.y > WORLD.H - PLATY.H) { g.y = WORLD.H - PLATY.H; g.vy = 0; }
  {
    const c0 = Math.floor(g.x / TILE), c1 = Math.floor((g.x + PLATY.W - 1) / TILE);
    if (g.vy > 0) {
      const r = Math.floor((g.y + PLATY.H - 1) / TILE);
      for (let c = c0; c <= c1; c++) if (solidAt(g, c, r)) { g.y = r * TILE - PLATY.H; g.vy = 0; break; }
    } else if (g.vy < 0) {
      const r = Math.floor(g.y / TILE);
      for (let c = c0; c <= c1; c++) if (solidAt(g, c, r)) { g.y = (r + 1) * TILE; g.vy = 0; break; }
    }
  }

  // Electric seaweed.
  if (g.invuln <= 0) {
    for (const sw of g.seaweeds) {
      if (seaweedState(g.gameTime, sw) === 2 && overlaps(g.x, g.y, PLATY.W, PLATY.H, sw)) {
        killPlatypus(g);
        break;
      }
    }
  }
  if (g.status !== "playing") return g;

  for (const b of g.bombs) {
    if (b.defused) continue;
    if (overlaps(g.x, g.y, PLATY.W, PLATY.H, { x: b.x - 9, y: b.y - 9, w: 18, h: 18 })) b.defused = true;
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
