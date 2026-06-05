// Game logic for "The Damn Level" — a homage to the infamous underwater dam
// stage from the 1989 TMNT NES game, with platypuses. The map is a generated
// network of narrow tunnels carved through rock (a braided maze, so it's fully
// connected and always solvable). Swim the floaty current through the tunnels,
// defuse every bomb before the timer blows the dam, and weave past electric
// seaweed that gates the corridors. You get four platypuses; the seaweed will
// take most of them — and each death drops you back at the entrance.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 18;
export const WORLD = { W: COLS * TILE, H: ROWS * TILE } as const; // 960 x 720

export const PLATY = { W: 18, H: 14 } as const;
export const PLATYPUS_START = 4;
export const TIME_START = 100; // seconds on the bomb timer

const BOMB_COUNT = 12;

// Floaty water movement.
const ACCEL = 640;
const DRAG = 4.0;
const MAX_SPEED = 160;
const CURRENT_X = 30;
const CURRENT_Y = 18;

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

// Carve organic, winding caverns with random-walk "miners", then line the
// cavern walls with electric weeds of varying length hanging from the ceilings
// and rising from the floors — so the safe path snakes up and down between
// them. Connectivity is guaranteed (all caverns are carved from one source).
function buildLevel(rand: () => number) {
  const grid = new Uint8Array(ROWS * COLS).fill(1);
  const at = (r: number, c: number) => r * COLS + c;

  // 3-wide brush → roomy tunnels.
  const carve = (c: number, r: number) => {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (cc >= 1 && cc < COLS - 1 && rr >= 1 && rr < ROWS - 1) grid[at(rr, cc)] = 0;
      }
  };

  const startC = 2, startR = Math.floor(ROWS / 2);
  const card = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  type Miner = { c: number; r: number; dc: number; dr: number };
  const miners: Miner[] = [{ c: startC, r: startR, dc: 1, dr: 0 }];
  carve(startC, startR);

  const target = Math.floor((COLS - 2) * (ROWS - 2) * 0.42);
  const openCountAll = () => {
    let n = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] === 0) n++;
    return n;
  };

  let safety = 0;
  while (openCountAll() < target && safety++ < 4000) {
    for (const m of miners) {
      if (rand() < 0.2) {
        const d = card[Math.floor(rand() * 4)];
        m.dc = d[0];
        m.dr = d[1];
      }
      m.c += m.dc;
      m.r += m.dr;
      if (m.c < 2) { m.c = 2; m.dc = 1; }
      if (m.c > COLS - 3) { m.c = COLS - 3; m.dc = -1; }
      if (m.r < 2) { m.r = 2; m.dr = 1; }
      if (m.r > ROWS - 3) { m.r = ROWS - 3; m.dr = -1; }
      carve(m.c, m.r);
    }
    if (rand() < 0.05 && miners.length < 4) {
      const src = miners[Math.floor(rand() * miners.length)];
      const d = card[Math.floor(rand() * 4)];
      miners.push({ c: src.c, r: src.r, dc: d[0], dr: d[1] });
    }
  }

  const shuffle = <T,>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Weeds line the cavern walls: for each vertical open span in a column, a
  // weed hangs from the ceiling and one rises from the floor, with lengths that
  // sum to leave a guaranteed gap. Because the gap's position varies per column,
  // the safe channel snakes up and down — the tunnels are never straight.
  const seaweeds: Seaweed[] = [];
  for (let c = 1; c < COLS - 1; c++) {
    let r = 1;
    while (r < ROWS - 1) {
      if (grid[at(r, c)] !== 0) { r++; continue; }
      let r1 = r;
      while (r1 + 1 < ROWS - 1 && grid[at(r1 + 1, c)] === 0) r1++;
      const spanPx = (r1 - r + 1) * TILE;
      const top = r * TILE;
      const nearStart = Math.abs(c - startC) <= 2 && Math.abs((r + r1) / 2 - startR) <= 2;
      if (!nearStart && spanPx >= TILE && rand() < 0.85) {
        const x = c * TILE + 5, w = TILE - 10;
        const minGap = Math.max(28, Math.min(60, spanPx * 0.42));
        const available = spanPx - minGap;
        if (available >= 24) {
          const lc = Math.round(available * (0.15 + rand() * 0.7));
          const lf = Math.round(available) - lc;
          if (lc >= 12) seaweeds.push({ x, y: top, w, h: lc, phase: rand() * 2 });
          if (lf >= 12) seaweeds.push({ x, y: top + spanPx - lf, w, h: lf, phase: rand() * 2 });
        } else {
          // narrow span — a single short weed
          const fromTop = rand() < 0.5;
          seaweeds.push({ x, y: fromTop ? top : top + spanPx - 16, w, h: 16, phase: rand() * 2 });
        }
      }
      r = r1 + 2;
    }
  }

  // Bombs — spread across open tiles, away from each other and the start.
  const openTiles: [number, number][] = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) if (grid[at(r, c)] === 0) openTiles.push([r, c]);
  const sh = shuffle([...openTiles]);
  const bombs: Bomb[] = [];
  const spaced = (r: number, c: number, minStart: number) =>
    Math.max(Math.abs(r - startR), Math.abs(c - startC)) >= minStart &&
    bombs.every((b) => Math.max(Math.abs(b.y / TILE - 0.5 - r), Math.abs(b.x / TILE - 0.5 - c)) >= 3);
  for (let minStart = 5; bombs.length < BOMB_COUNT && minStart >= 0; minStart--) {
    for (const [r, c] of sh) {
      if (bombs.length >= BOMB_COUNT) break;
      if (spaced(r, c, minStart)) bombs.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, defused: false });
    }
  }
  for (const [r, c] of sh) {
    if (bombs.length >= BOMB_COUNT) break;
    const bx = c * TILE + TILE / 2, by = r * TILE + TILE / 2;
    if (!bombs.some((b) => b.x === bx && b.y === by)) bombs.push({ x: bx, y: by, defused: false });
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
