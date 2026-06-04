"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, RotateCcw, Play } from "lucide-react";
import {
  VIRT,
  SHIP,
  WALL_W,
  GAP,
  ALIEN_R,
  type World,
  type Input,
  createWorld,
  updateWorld,
  scoreOf,
  alienY,
} from "@/lib/sidescroller";

type Phase = "menu" | "playing" | "dead";

const BEST_KEY = "sidescroller-best";
const ACCENT = "#7c6cff";

type Star = { x: number; y: number; z: number };

export default function SideScroller() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  // Mutable game refs (kept out of React state so the rAF loop is allocation-free).
  const worldRef = useRef<World | null>(null);
  const inputRef = useRef<Input>({ up: false, down: false });
  const phaseRef = useRef<Phase>("menu");
  const starsRef = useRef<Star[]>([]);
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

  // Render + simulation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIRT.W * dpr;
    canvas.height = VIRT.H * dpr;
    ctx.scale(dpr, dpr);

    // Build the parallax starfield once.
    if (starsRef.current.length === 0) {
      const stars: Star[] = [];
      for (let i = 0; i < 90; i++) {
        stars.push({
          x: Math.random() * VIRT.W,
          y: Math.random() * VIRT.H,
          z: 0.3 + Math.random() * 0.7, // depth → speed & size
        });
      }
      starsRef.current = stars;
    }

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000); // clamp big gaps (tab switches)
      lastRef.current = ts;

      const playing = phaseRef.current === "playing";
      const world = worldRef.current;

      // --- update ---
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
          // throttle React updates: refresh the HUD score occasionally
          setScore(scoreOf(world));
        }
      }

      // starfield always drifts (even on menus) for ambiance
      const starSpeed = world && playing ? world.speed : 120;
      const stars = starsRef.current;
      for (const st of stars) {
        st.x -= starSpeed * st.z * dt;
        if (st.x < 0) {
          st.x = VIRT.W;
          st.y = Math.random() * VIRT.H;
        }
      }

      draw(ctx, world, stars, playing || phaseRef.current === "dead");
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Pointer controls — hold the upper/lower half of the board, or the buttons.
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
          <span className="tabular-nums font-semibold text-foreground">
            {score}
          </span>
        </span>
        <span className="text-muted">
          Best{" "}
          <span className="tabular-nums font-semibold text-accent">{best}</span>
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-[0_0_80px_-30px_var(--color-accent)]"
        style={{ aspectRatio: `${VIRT.W} / ${VIRT.H}`, touchAction: "none" }}
        onPointerDown={onPointer}
        onPointerMove={(e) => e.buttons && onPointer(e)}
        onPointerUp={() => setDir(null)}
        onPointerLeave={() => setDir(null)}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm">
            {phase === "menu" ? (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                  Retro
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  If Then Explosion
                </h2>
                <p className="mt-3 max-w-xs text-center text-sm text-muted">
                  Fly the ship through the gaps and dodge the aliens. Up / Down
                  arrows (or W / S) — on touch, hold the top or bottom of the
                  screen.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                  Game over
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  {score} <span className="text-muted">pts</span>
                </h2>
                {score >= best && score > 0 && (
                  <p className="mt-1 text-sm text-accent">New best! 🎉</p>
                )}
              </>
            )}
            <button
              onClick={start}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
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
        ↑ / ↓ or W / S to steer · the gaps and aliens are generated so a safe
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
// Canvas drawing
// --------------------------------------------------------------------------
function draw(
  ctx: CanvasRenderingContext2D,
  world: World | null,
  stars: Star[],
  showWorld: boolean,
) {
  // Background: deep space gradient.
  const g = ctx.createLinearGradient(0, 0, 0, VIRT.H);
  g.addColorStop(0, "#05050c");
  g.addColorStop(1, "#0b0716");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIRT.W, VIRT.H);

  // Stars.
  for (const st of stars) {
    ctx.globalAlpha = 0.25 + st.z * 0.6;
    ctx.fillStyle = st.z > 0.75 ? "#c9c4ff" : "#6b6b80";
    const s = st.z * 2.2;
    ctx.fillRect(st.x, st.y, s, s);
  }
  ctx.globalAlpha = 1;

  if (!world || !showWorld) return;

  // Walls — neon barriers with a glowing edge around the gap.
  for (const wall of world.walls) {
    const gapTop = wall.center - GAP / 2;
    const gapBot = wall.center + GAP / 2;
    drawWallSlab(ctx, wall.x, 0, gapTop);
    drawWallSlab(ctx, wall.x, gapBot, VIRT.H - gapBot);
  }

  // Aliens.
  for (const a of world.aliens) {
    drawAlien(ctx, a.x, alienY(world, a), a.entry);
  }

  // Ship.
  drawShip(ctx, SHIP.X, world.shipY, world.dead);
}

function drawWallSlab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
) {
  if (h <= 0) return;
  const grad = ctx.createLinearGradient(x, 0, x + WALL_W, 0);
  grad.addColorStop(0, "#2a2150");
  grad.addColorStop(0.5, "#4a3aa0");
  grad.addColorStop(1, "#2a2150");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, WALL_W, h);
  // Glowing inner edge facing the gap.
  ctx.fillStyle = ACCENT;
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 16;
  const edgeY = y === 0 ? y + h - 4 : y;
  ctx.fillRect(x, edgeY, WALL_W, 4);
  ctx.shadowBlur = 0;
}

function drawAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  entry: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.3 + 0.7 * Math.min(1, entry);
  // Classic invader silhouette as a chunky pixel blob.
  ctx.fillStyle = "#48e0a0";
  ctx.shadowColor = "#48e0a0";
  ctx.shadowBlur = 12;
  const p = ALIEN_R / 4; // pixel unit
  // body
  ctx.fillRect(-3 * p, -2 * p, 6 * p, 4 * p);
  // head bump
  ctx.fillRect(-2 * p, -3 * p, 4 * p, p);
  // legs
  ctx.fillRect(-3 * p, 2 * p, p, 1.5 * p);
  ctx.fillRect(2 * p, 2 * p, p, 1.5 * p);
  ctx.shadowBlur = 0;
  // eyes
  ctx.fillStyle = "#05050c";
  ctx.fillRect(-1.6 * p, -1.2 * p, p, p);
  ctx.fillRect(0.6 * p, -1.2 * p, p, p);
  ctx.restore();
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dead: boolean,
) {
  ctx.save();
  ctx.translate(x, y);

  // Thruster flame (flickers).
  if (!dead) {
    const flame = 10 + Math.random() * 8;
    const fg = ctx.createLinearGradient(-SHIP.W / 2 - flame, 0, -SHIP.W / 2, 0);
    fg.addColorStop(0, "rgba(255,160,40,0)");
    fg.addColorStop(1, "#ffb030");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-SHIP.W / 2, -5);
    ctx.lineTo(-SHIP.W / 2 - flame, 0);
    ctx.lineTo(-SHIP.W / 2, 5);
    ctx.closePath();
    ctx.fill();
  }

  // Hull — sleek arrow.
  ctx.fillStyle = dead ? "#7a2740" : "#d6d3ff";
  ctx.shadowColor = dead ? "#ff4d6d" : ACCENT;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(SHIP.W / 2, 0);
  ctx.lineTo(-SHIP.W / 2, -SHIP.H / 2);
  ctx.lineTo(-SHIP.W / 3, 0);
  ctx.lineTo(-SHIP.W / 2, SHIP.H / 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cockpit.
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(SHIP.W / 8, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
