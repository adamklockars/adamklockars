"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, RotateCcw, Play } from "lucide-react";
import {
  VIRT,
  SHIP,
  ALIEN_R,
  type World,
  type Input,
  createWorld,
  updateWorld,
  scoreOf,
  alienY,
  caveBounds,
} from "@/lib/sidescroller";

type Phase = "menu" | "playing" | "dead";

const BEST_KEY = "sidescroller-best";

// Retro green CRT palette.
const GREEN = "#39ff6a"; // bright phosphor green
const GREEN_DIM = "#1f9c47";
const WALL_FILL = "#0c3a1d";
const WALL_EDGE = "#36e063";
const PX = 8; // chunky pixel grid for the cave walls

type Fleck = { x: number; y: number; z: number };

export default function SideScroller() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const worldRef = useRef<World | null>(null);
  const inputRef = useRef<Input>({ up: false, down: false });
  const phaseRef = useRef<Phase>("menu");
  const flecksRef = useRef<Fleck[]>([]);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) || 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  const start = useCallback(() => {
    worldRef.current = createWorld();
    inputRef.current = { up: false, down: false };
    setScore(0);
    setPhase("playing");
  }, []);

  // Keyboard input.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") {
        inputRef.current.up = true;
        e.preventDefault();
      } else if (k === "ArrowDown" || k === "s" || k === "S") {
        inputRef.current.down = true;
        e.preventDefault();
      } else if (k === " " || k === "Enter") {
        if (phaseRef.current !== "playing") {
          start();
          e.preventDefault();
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") inputRef.current.up = false;
      else if (k === "ArrowDown" || k === "s" || k === "S")
        inputRef.current.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start]);

  // Simulation + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIRT.W * dpr;
    canvas.height = VIRT.H * dpr;
    ctx.scale(dpr, dpr);

    // Faint drifting flecks for depth (very subtle, green).
    if (flecksRef.current.length === 0) {
      const flecks: Fleck[] = [];
      for (let i = 0; i < 50; i++) {
        flecks.push({
          x: Math.random() * VIRT.W,
          y: Math.random() * VIRT.H,
          z: 0.3 + Math.random() * 0.7,
        });
      }
      flecksRef.current = flecks;
    }

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastRef.current = ts;

      const playing = phaseRef.current === "playing";
      const world = worldRef.current;

      if (playing && world) {
        updateWorld(world, dt, inputRef.current);
        if (world.dead) {
          const s = scoreOf(world);
          setScore(s);
          setBest((b) => {
            const nb = Math.max(b, s);
            localStorage.setItem(BEST_KEY, String(nb));
            return nb;
          });
          setPhase("dead");
        } else if (Math.random() < 0.2) {
          setScore(scoreOf(world));
        }
      }

      const driftSpeed = world && playing ? world.speed : 90;
      const flecks = flecksRef.current;
      for (const f of flecks) {
        f.x -= driftSpeed * f.z * dt;
        if (f.x < 0) {
          f.x = VIRT.W;
          f.y = Math.random() * VIRT.H;
        }
      }

      draw(ctx, world, flecks, playing || phaseRef.current === "dead");
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const setDir = (dir: "up" | "down" | null) => {
    inputRef.current.up = dir === "up";
    inputRef.current.down = dir === "down";
  };
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / rect.height;
    setDir(rel < 0.5 ? "up" : "down");
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between font-mono text-sm">
        <span className="text-muted">
          Score{" "}
          <span className="tabular-nums font-semibold" style={{ color: GREEN }}>
            {score}
          </span>
        </span>
        <span className="text-muted">
          Best{" "}
          <span className="tabular-nums font-semibold" style={{ color: GREEN }}>
            {best}
          </span>
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-black"
        style={{
          aspectRatio: `${VIRT.W} / ${VIRT.H}`,
          touchAction: "none",
          boxShadow: `0 0 80px -30px ${GREEN}`,
        }}
        onPointerDown={onPointer}
        onPointerMove={(e) => e.buttons && onPointer(e)}
        onPointerUp={() => setDir(null)}
        onPointerLeave={() => setDir(null)}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
            {phase === "menu" ? (
              <>
                <p
                  className="font-mono text-xs uppercase tracking-[0.3em]"
                  style={{ color: GREEN }}
                >
                  Retro · Turing
                </p>
                <h2
                  className="mt-2 font-display text-3xl font-bold sm:text-4xl"
                  style={{ color: GREEN }}
                >
                  If Then Explosion
                </h2>
                <p className="mt-3 max-w-xs text-center text-sm text-muted">
                  Fly the triangle through the cave. The walls close toward the
                  centre and aliens squeeze the gap — but there&apos;s always a
                  way through. Up / Down arrows (or W / S); on touch, hold the
                  top or bottom.
                </p>
              </>
            ) : (
              <>
                <p
                  className="font-mono text-xs uppercase tracking-[0.3em]"
                  style={{ color: "#ff5d5d" }}
                >
                  Boom
                </p>
                <h2
                  className="mt-2 font-display text-3xl font-bold sm:text-4xl"
                  style={{ color: GREEN }}
                >
                  {score} <span className="text-muted">pts</span>
                </h2>
                {score >= best && score > 0 && (
                  <p className="mt-1 text-sm" style={{ color: GREEN }}>
                    New best! 🟢
                  </p>
                )}
              </>
            )}
            <button
              onClick={start}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 font-medium text-black transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: GREEN }}
            >
              {phase === "menu" ? (
                <Play className="size-4" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {phase === "menu" ? "Start" : "Play again"}
            </button>
          </div>
        )}
      </div>

      {/* Touch / click controls */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
        <HoldButton onHold={(h) => (inputRef.current.up = h)} label="Up">
          <ChevronUp className="size-5" />
        </HoldButton>
        <HoldButton onHold={(h) => (inputRef.current.down = h)} label="Down">
          <ChevronDown className="size-5" />
        </HoldButton>
      </div>

      <p className="mt-4 hidden text-center font-mono text-xs text-faint sm:block">
        ↑ / ↓ or W / S to steer · the cave and aliens are generated so a safe
        path always exists
      </p>
    </div>
  );
}

function HoldButton({
  onHold,
  label,
  children,
}: {
  onHold: (held: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-4 text-sm font-medium text-foreground active:bg-surface-2"
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {children}
      {label}
    </button>
  );
}

// --------------------------------------------------------------------------
// Canvas drawing — retro green CRT
// --------------------------------------------------------------------------
function draw(
  ctx: CanvasRenderingContext2D,
  world: World | null,
  flecks: Fleck[],
  showWorld: boolean,
) {
  // Dark green-black background.
  ctx.fillStyle = "#02140a";
  ctx.fillRect(0, 0, VIRT.W, VIRT.H);

  // Faint drifting flecks.
  for (const f of flecks) {
    ctx.globalAlpha = 0.06 + f.z * 0.12;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  if (world && showWorld) {
    drawCave(ctx, world);
    for (const a of world.aliens) drawAlien(ctx, a.x, alienY(world, a), a.entry);
    drawShip(ctx, world);
  }

  drawScanlines(ctx);
}

// The continuous cave: chunky pixel columns from each edge to the wall surface.
function drawCave(ctx: CanvasRenderingContext2D, world: World) {
  for (let x = 0; x < VIRT.W; x += PX) {
    const { top, bottom } = caveBounds(world, world.distance + x + PX / 2);
    const topQ = Math.max(0, Math.round(top / PX) * PX);
    const botQ = Math.min(VIRT.H, Math.round(bottom / PX) * PX);

    // Wall bodies.
    ctx.fillStyle = WALL_FILL;
    if (topQ > 0) ctx.fillRect(x, 0, PX, topQ);
    if (botQ < VIRT.H) ctx.fillRect(x, botQ, PX, VIRT.H - botQ);

    // Bright phosphor edge along the passage.
    ctx.fillStyle = WALL_EDGE;
    if (topQ > 0) ctx.fillRect(x, topQ - PX, PX, PX);
    if (botQ < VIRT.H) ctx.fillRect(x, botQ, PX, PX);
  }
}

function drawAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  entry: number,
) {
  ctx.save();
  ctx.translate(x, y);
  const s = 0.4 + 0.6 * Math.min(1, entry);
  ctx.scale(s, s);
  ctx.globalAlpha = Math.min(1, entry + 0.3);

  // Chunky invader, a touch lighter than the walls so it reads as a hazard.
  ctx.fillStyle = "#9dff66";
  ctx.shadowColor = "#9dff66";
  ctx.shadowBlur = 8;
  const p = ALIEN_R / 4;
  ctx.fillRect(-3 * p, -2 * p, 6 * p, 4 * p);
  ctx.fillRect(-2 * p, -3 * p, 4 * p, p);
  ctx.fillRect(-3 * p, 2 * p, p, 1.5 * p);
  ctx.fillRect(2 * p, 2 * p, p, 1.5 * p);
  ctx.shadowBlur = 0;
  // Dark eyes.
  ctx.fillStyle = "#02140a";
  ctx.fillRect(-1.6 * p, -1.2 * p, p, p);
  ctx.fillRect(0.6 * p, -1.2 * p, p, p);
  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, world: World) {
  const x = SHIP.X;
  const y = world.shipY;
  ctx.save();
  ctx.translate(x, y);

  // Thruster flicker.
  if (!world.dead) {
    const flame = 8 + Math.random() * 7;
    ctx.fillStyle = "rgba(57,255,106,0.5)";
    ctx.beginPath();
    ctx.moveTo(-SHIP.TAIL, -4);
    ctx.lineTo(-SHIP.TAIL - flame, 0);
    ctx.lineTo(-SHIP.TAIL, 4);
    ctx.closePath();
    ctx.fill();
  }

  // The ship — a simple triangle, just like the Turing original.
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(SHIP.NOSE, 0);
  ctx.lineTo(-SHIP.TAIL, -SHIP.HALF_H);
  ctx.lineTo(-SHIP.TAIL, SHIP.HALF_H);
  ctx.closePath();
  ctx.fillStyle = world.dead ? "#7a2740" : "rgba(57,255,106,0.18)";
  ctx.fill();
  ctx.strokeStyle = world.dead ? "#ff5d6d" : GREEN;
  ctx.shadowColor = world.dead ? "#ff5d6d" : GREEN;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// CRT scanlines overlay.
function drawScanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < VIRT.H; y += 3) ctx.fillRect(0, y, VIRT.W, 1);
}
