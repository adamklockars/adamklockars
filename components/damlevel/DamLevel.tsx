"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  VIRT,
  TURTLE,
  WALLS,
  SEAWEEDS,
  TURTLES_START,
  type Game,
  type Input,
  createGame,
  updateGame,
  seaweedState,
  bombsLeft,
  endMessage,
} from "@/lib/damlevel";

type Phase = "menu" | "playing" | "win" | "lose";

const BEST_KEY = "damlevel-best";
const HUD_H = 30;
// Bandana colours for the four turtles.
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
    canvas.width = VIRT.W;
    canvas.height = VIRT.H + HUD_H;
    ctx.imageSmoothingEnabled = false;

    if (bubblesRef.current.length === 0) {
      bubblesRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * VIRT.W,
        y: Math.random() * VIRT.H,
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
          setSurvivors(g.turtles);
          if (g.status === "win") {
            setBest((prev) => {
              const nb = Math.max(prev, g.turtles);
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
          b.y = VIRT.H + 4;
          b.x = Math.random() * VIRT.W;
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
            {best > 0 ? `${best} 🐢 left` : "—"}
          </span>
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-border bg-black"
        style={{ aspectRatio: `${VIRT.W} / ${VIRT.H + HUD_H}`, boxShadow: "0 0 80px -34px #2f9e44" }}
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
                  The Dam Level
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-snug text-muted sm:text-sm">
                  Swim the dam and defuse all the bombs before the timer hits
                  zero. The electric seaweed kills on contact — you only get four
                  turtles. Arrows / WASD to swim.
                </p>
              </>
            ) : phase === "win" ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: "#7fffd4" }}>
                  Dam defused
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold sm:text-4xl">
                  {survivors} 🐢 left
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
        ↑ ↓ ← → or WASD to swim · the water current never stops pushing you
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
// Pixel rendering
// --------------------------------------------------------------------------
function draw(ctx: CanvasRenderingContext2D, g: Game | null, bubbles: Bubble[]) {
  // HUD bar.
  ctx.fillStyle = "#081627";
  ctx.fillRect(0, 0, VIRT.W, HUD_H);
  ctx.font = "12px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  if (g) {
    ctx.fillStyle = g.time < 15 ? "#ff5d5d" : "#7fffd4";
    ctx.fillText(`TIME ${Math.ceil(g.time)}`, 8, HUD_H / 2);
    ctx.fillStyle = "#ffe066";
    ctx.fillText(`BOMBS ${bombsLeft(g)}`, 110, HUD_H / 2);
    for (let i = 0; i < TURTLES_START; i++) {
      ctx.fillStyle = i < g.turtles ? COLORS[i] : "#1c2937";
      ctx.fillRect(VIRT.W - 104 + i * 26, 9, 18, 13);
      ctx.fillStyle = "#06101c";
      ctx.fillRect(VIRT.W - 104 + i * 26 + 4, 13, 10, 4); // bandana slit
    }
  }

  ctx.save();
  ctx.translate(0, HUD_H);

  // Water.
  const grad = ctx.createLinearGradient(0, 0, 0, VIRT.H);
  grad.addColorStop(0, "#0b3a63");
  grad.addColorStop(1, "#06243f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIRT.W, VIRT.H);

  for (const b of bubbles) {
    ctx.fillStyle = "rgba(160,220,255,0.18)";
    ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.r, b.r);
  }

  // Dam walls (gray with rivets).
  for (const w of WALLS) {
    ctx.fillStyle = "#5b6675";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#454e5b";
    ctx.fillRect(w.x, w.y, 3, w.h);
    ctx.fillStyle = "#7a8694";
    for (let ry = w.y + 8; ry < w.y + w.h - 4; ry += 18) {
      ctx.fillRect(w.x + w.w / 2 - 1, ry, 2, 2);
    }
  }

  if (g) {
    // Electric seaweed.
    for (const sw of SEAWEEDS) {
      const st = seaweedState(g.gameTime, sw);
      const zap = st === 2;
      const warn = st === 1;
      let col = "#2f9e44";
      if (zap) col = (Math.floor(g.gameTime * 30) % 2 ? "#ffffff" : "#ffe04d");
      else if (warn) col = (Math.floor(g.gameTime * 18) % 2 ? "#a7e34d" : "#2f9e44");
      // Wavy strand.
      for (let yy = 0; yy < sw.h; yy += 6) {
        const wob = Math.sin((g.gameTime * 3 + (sw.y + yy) * 0.15)) * 2;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(sw.x + wob), sw.y + yy, sw.w, 6);
      }
      if (zap) {
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

    // Bombs.
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
        ctx.fillRect(b.x - 1, b.y - 9, 2, 3); // fuse cap
        const blink = Math.floor(g.gameTime * 4) % 2 === 0;
        ctx.fillStyle = blink ? "#ff3b3b" : "#7a1f1f";
        ctx.fillRect(b.x - 2, b.y - 2, 3, 3); // light
      }
    }

    // Turtle (blinks while invulnerable).
    const blink = g.invuln > 0 && Math.floor(g.gameTime * 12) % 2 === 0;
    if (!blink) drawTurtle(ctx, g);

    // Death flash.
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${(g.flash / 0.25) * 0.4})`;
      ctx.fillRect(0, 0, VIRT.W, VIRT.H);
    }
  }

  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTurtle(ctx: CanvasRenderingContext2D, g: Game) {
  const x = g.x;
  const y = g.y;
  const w = TURTLE.W;
  const h = TURTLE.H;
  const color = COLORS[TURTLES_START - g.turtles] ?? COLORS[3];

  // Shell.
  ctx.fillStyle = "#1f7a2e";
  ctx.fillRect(x + 2, y + 2, w - 4, h - 3);
  ctx.fillStyle = "#2fae45";
  ctx.fillRect(x + 4, y + 4, w - 8, h - 7);
  // shell segments
  ctx.fillStyle = "#1a5c25";
  ctx.fillRect(x + w / 2 - 1, y + 3, 2, h - 5);

  // Head (faces heading).
  const hx = g.facing > 0 ? x + w - 3 : x - 3;
  ctx.fillStyle = "#36c24f";
  ctx.fillRect(hx, y + 4, 5, 6);
  // bandana
  ctx.fillStyle = color;
  ctx.fillRect(hx - (g.facing > 0 ? 0 : 0), y + 4, 5, 2);
  // eye
  ctx.fillStyle = "#fff";
  ctx.fillRect(hx + (g.facing > 0 ? 2 : 1), y + 6, 2, 2);

  // Limbs.
  ctx.fillStyle = "#36c24f";
  ctx.fillRect(x, y + h - 4, 3, 3);
  ctx.fillRect(x + w - 3, y + h - 4, 3, 3);
}
