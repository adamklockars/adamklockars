"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  WORLD,
  PLATY,
  TILE,
  COLS,
  ROWS,
  PLATYPUS_START,
  type Game,
  type Input,
  createGame,
  updateGame,
  seaweedState,
  bombsLeft,
  endMessage,
  solidAt,
} from "@/lib/damlevel";

type Phase = "menu" | "playing" | "win" | "lose";

const BEST_KEY = "damlevel-best";
const HUD_H = 30;
const VIEW = { W: 480, H: 360 }; // scrolling window into the world
// Marker colours for the four platypuses.
const COLORS = ["#2f6bff", "#ff7a1a", "#a64dff", "#ff3b3b"];

type Bubble = { x: number; y: number; r: number; sp: number };

export default function DamLevel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const inputRef = useRef<Input>({ up: false, down: false, left: false, right: false });
  const phaseRef = useRef<Phase>("menu");
  const bubblesRef = useRef<Bubble[]>([]);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("menu");
  const [best, setBest] = useState(0);
  const [endMsg, setEndMsg] = useState("");
  const [survivors, setSurvivors] = useState(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const b = Number(localStorage.getItem(BEST_KEY) || 0);
    if (Number.isFinite(b)) setBest(b);
  }, []);

  const start = useCallback(() => {
    gameRef.current = createGame();
    inputRef.current = { up: false, down: false, left: false, right: false };
    setPhase("playing");
  }, []);

  // Keyboard.
  useEffect(() => {
    const map: Record<string, keyof Input> = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right",
    };
    const down = (e: KeyboardEvent) => {
      if (e.key in map) {
        inputRef.current[map[e.key]] = true;
        e.preventDefault();
      } else if ((e.key === " " || e.key === "Enter") && phaseRef.current !== "playing") {
        start();
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key in map) inputRef.current[map[e.key]] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start]);

  // Loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = VIEW.W;
    canvas.height = VIEW.H + HUD_H;
    ctx.imageSmoothingEnabled = false;

    if (bubblesRef.current.length === 0) {
      bubblesRef.current = Array.from({ length: 36 }, () => ({
        x: Math.random() * VIEW.W,
        y: Math.random() * VIEW.H,
        r: 1 + Math.random() * 2,
        sp: 12 + Math.random() * 26,
      }));
    }

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastRef.current = ts;

      const g = gameRef.current;
      if (g && phaseRef.current === "playing") {
        updateGame(g, dt, inputRef.current);
        if (g.status !== "playing") {
          setEndMsg(endMessage(g));
          setSurvivors(g.platypuses);
          if (g.status === "win") {
            setBest((prev) => {
              const nb = Math.max(prev, g.platypuses);
              localStorage.setItem(BEST_KEY, String(nb));
              return nb;
            });
          }
          setPhase(g.status);
        }
      }

      for (const b of bubblesRef.current) {
        b.y -= b.sp * dt;
        if (b.y < -4) {
          b.y = VIEW.H + 4;
          b.x = Math.random() * VIEW.W;
        }
      }

      draw(ctx, g, bubblesRef.current);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const hold = (k: keyof Input, v: boolean) => (inputRef.current[k] = v);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex items-center justify-between font-mono text-xs text-muted">
        <span>Defuse every bomb before the dam blows. Mind the seaweed.</span>
        <span>
          Best:{" "}
          <span className="font-semibold text-accent">
            {best > 0 ? `${best} left` : "—"}
          </span>
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-border bg-black"
        style={{ aspectRatio: `${VIEW.W} / ${VIEW.H + HUD_H}`, boxShadow: "0 0 80px -34px #2f9e44" }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center bg-black/70 backdrop-blur-sm">
            {phase === "menu" ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent sm:text-xs">
                  Underwater · 8-bit
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold sm:text-4xl">
                  The Damn Level
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-snug text-muted sm:text-sm">
                  Swim the dam maze and defuse all the bombs before the timer
                  hits zero. The electric seaweed kills on contact — you only get
                  four platypuses. Arrows / WASD to swim; the view scrolls with
                  you.
                </p>
              </>
            ) : phase === "win" ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: "#7fffd4" }}>
                  Dam defused
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold sm:text-4xl">
                  {survivors} platypus{survivors === 1 ? "" : "es"} left
                </h2>
                <p className="mt-2 max-w-xs text-xs italic leading-snug text-muted sm:text-sm">
                  {endMsg}
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: "#ff5d5d" }}>
                  Wiped out
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold sm:text-4xl">
                  Game Over
                </h2>
                <p className="mt-2 max-w-xs text-xs italic leading-snug text-muted sm:text-sm">
                  {endMsg}
                </p>
              </>
            )}
            <button
              onClick={start}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
            >
              {phase === "menu" ? <Play className="size-4" /> : <RotateCcw className="size-4" />}
              {phase === "menu" ? "Dive in" : "Try again"}
            </button>
          </div>
        )}
      </div>

      {/* Touch D-pad */}
      <div className="mt-4 grid grid-cols-3 grid-rows-2 gap-2 sm:hidden" style={{ maxWidth: 220, marginInline: "auto" }}>
        <Dpad label="↑" k="up" hold={hold} className="col-start-2 row-start-1" />
        <Dpad label="←" k="left" hold={hold} className="col-start-1 row-start-2" />
        <Dpad label="↓" k="down" hold={hold} className="col-start-2 row-start-2" />
        <Dpad label="→" k="right" hold={hold} className="col-start-3 row-start-2" />
      </div>

      <p className="mt-3 hidden text-center font-mono text-xs text-faint sm:block">
        ↑ ↓ ← → or WASD to swim · the current never stops pushing you · the view
        scrolls with your platypus
      </p>
    </div>
  );
}

function Dpad({
  label,
  k,
  hold,
  className,
}: {
  label: string;
  k: keyof Input;
  hold: (k: keyof Input, v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      aria-label={k}
      className={`flex items-center justify-center rounded-lg border border-border bg-surface py-3 text-lg font-bold text-foreground active:bg-surface-2 ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        hold(k, true);
      }}
      onPointerUp={() => hold(k, false)}
      onPointerLeave={() => hold(k, false)}
      onPointerCancel={() => hold(k, false)}
    >
      {label}
    </button>
  );
}

// --------------------------------------------------------------------------
// Pixel rendering with a scrolling camera
// --------------------------------------------------------------------------
function draw(ctx: CanvasRenderingContext2D, g: Game | null, bubbles: Bubble[]) {
  // HUD bar.
  ctx.fillStyle = "#081627";
  ctx.fillRect(0, 0, VIEW.W, HUD_H);
  ctx.font = "12px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  if (g) {
    ctx.fillStyle = g.time < 15 ? "#ff5d5d" : "#7fffd4";
    ctx.fillText(`TIME ${Math.ceil(g.time)}`, 8, HUD_H / 2);
    ctx.fillStyle = "#ffe066";
    ctx.fillText(`BOMBS ${bombsLeft(g)}`, 110, HUD_H / 2);
    for (let i = 0; i < PLATYPUS_START; i++) {
      ctx.fillStyle = i < g.platypuses ? COLORS[i] : "#1c2937";
      ctx.fillRect(VIEW.W - 104 + i * 26, 9, 18, 13);
      ctx.fillStyle = "#06101c";
      ctx.fillRect(VIEW.W - 104 + i * 26 + 12, 12, 6, 4); // little bill
    }
  }

  // Camera follows the platypus, clamped to the world.
  let camX = 0, camY = 0;
  if (g) {
    camX = Math.max(0, Math.min(WORLD.W - VIEW.W, g.x + PLATY.W / 2 - VIEW.W / 2));
    camY = Math.max(0, Math.min(WORLD.H - VIEW.H, g.y + PLATY.H / 2 - VIEW.H / 2));
  }

  ctx.save();
  // Clip to the play viewport so the world never bleeds into the HUD.
  ctx.beginPath();
  ctx.rect(0, HUD_H, VIEW.W, VIEW.H);
  ctx.clip();
  ctx.translate(0, HUD_H);

  // Water (screen space).
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.H);
  grad.addColorStop(0, "#0b3a63");
  grad.addColorStop(1, "#06243f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  for (const b of bubbles) {
    ctx.fillStyle = "rgba(160,220,255,0.18)";
    ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.r, b.r);
  }

  // World space.
  ctx.save();
  ctx.translate(-camX, -camY);

  // Solid rock tiles (only the visible ones).
  if (g) {
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(COLS - 1, Math.floor((camX + VIEW.W) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(ROWS - 1, Math.floor((camY + VIEW.H) / TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!solidAt(g, c, r)) continue;
        const x = c * TILE, y = r * TILE;
        ctx.fillStyle = "#3a4654";
        ctx.fillRect(x, y, TILE, TILE);
        // lighter top edge where a tunnel is above (depth)
        if (!solidAt(g, c, r - 1)) {
          ctx.fillStyle = "#566275";
          ctx.fillRect(x, y, TILE, 3);
        }
        ctx.fillStyle = "#2c3642";
        ctx.fillRect(x, y, TILE, 1);
        ctx.fillRect(x, y, 1, TILE);
        // a couple of rivets
        ctx.fillStyle = "#4a5666";
        ctx.fillRect(x + 10, y + 12, 2, 2);
        ctx.fillRect(x + TILE - 14, y + TILE - 16, 2, 2);
      }
    }
  }

  if (g) {
    for (const sw of g.seaweeds) {
      const st = seaweedState(g.gameTime, sw);
      let col = "#2f9e44";
      if (st === 2) col = Math.floor(g.gameTime * 30) % 2 ? "#ffffff" : "#ffe04d";
      else if (st === 1) col = Math.floor(g.gameTime * 18) % 2 ? "#a7e34d" : "#2f9e44";
      for (let yy = 0; yy < sw.h; yy += 6) {
        const wob = Math.sin(g.gameTime * 3 + (sw.y + yy) * 0.15) * 2;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(sw.x + wob), sw.y + yy, sw.w, 6);
      }
      if (st === 2) {
        ctx.fillStyle = "#bfefff";
        for (let s = 0; s < 4; s++) {
          ctx.fillRect(
            sw.x - 3 + Math.floor(Math.random() * (sw.w + 6)),
            sw.y + Math.floor(Math.random() * sw.h),
            2,
            2,
          );
        }
      }
    }

    for (const b of g.bombs) {
      if (b.defused) {
        ctx.fillStyle = "#3a4654";
        circle(ctx, b.x, b.y, 6);
        ctx.fillStyle = "#7fffd4";
        ctx.fillRect(b.x - 3, b.y, 2, 2);
        ctx.fillRect(b.x - 1, b.y + 2, 2, 2);
        ctx.fillRect(b.x + 1, b.y - 2, 2, 4);
      } else {
        ctx.fillStyle = "#15181d";
        circle(ctx, b.x, b.y, 7);
        ctx.fillStyle = "#444";
        ctx.fillRect(b.x - 1, b.y - 9, 2, 3);
        const blink = Math.floor(g.gameTime * 4) % 2 === 0;
        ctx.fillStyle = blink ? "#ff3b3b" : "#7a1f1f";
        ctx.fillRect(b.x - 2, b.y - 2, 3, 3);
      }
    }

    const blink = g.invuln > 0 && Math.floor(g.gameTime * 12) % 2 === 0;
    if (!blink) drawPlatypus(ctx, g);
  }

  ctx.restore(); // world

  if (g && g.flash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${(g.flash / 0.25) * 0.4})`;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  }

  ctx.restore(); // clip + HUD translate
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatypus(ctx: CanvasRenderingContext2D, g: Game) {
  const x = g.x;
  const y = g.y;
  const w = PLATY.W;
  const h = PLATY.H;
  const f = g.facing; // 1 = right, -1 = left
  const color = COLORS[PLATYPUS_START - g.platypuses] ?? COLORS[3];

  // Body.
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(x + 3, y + 2, w - 6, h - 3);
  ctx.fillStyle = "#a06d34";
  ctx.fillRect(x + 5, y + 3, w - 10, h - 6);

  // Flat tail (behind, opposite facing).
  ctx.fillStyle = "#6b4521";
  const tailX = f > 0 ? x : x + w - 4;
  ctx.fillRect(tailX, y + 4, 4, h - 6);

  // Duck bill (front, in facing direction).
  ctx.fillStyle = "#3a2a18";
  const billX = f > 0 ? x + w - 5 : x;
  ctx.fillRect(billX, y + 5, 5, 4);

  // Head bump + colour marker (homage headband).
  const headX = f > 0 ? x + w - 9 : x + 4;
  ctx.fillStyle = color;
  ctx.fillRect(headX, y + 1, 5, 2);

  // Eye.
  ctx.fillStyle = "#fff";
  ctx.fillRect(f > 0 ? x + w - 8 : x + 5, y + 4, 2, 2);
}
