"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Play, ArrowUp, Zap } from "lucide-react";
import {
  VIRT,
  PIG,
  OBST_H,
  type World,
  createWorld,
  updateWorld,
  scoreOf,
  jump,
  dash,
} from "@/lib/flyingpig";

type Phase = "menu" | "playing" | "dead";

const BEST_KEY = "robopig-best";
const OBST_W = 30;

// A few cheeky game-over lines, in the spirit of the original.
const DEATH_LINES = [
  "The dream is over… for now.",
  "Even pigs with wings come down eventually.",
  "When the pig stumbled, so did the dream.",
  "Hold onto your dreams. And maybe land next time.",
];

export default function FlyingPig() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [deathLine, setDeathLine] = useState(DEATH_LINES[0]);

  const worldRef = useRef<World | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const hillsRef = useRef<number>(0); // parallax offset

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) || 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  const start = useCallback(() => {
    worldRef.current = createWorld();
    setScore(0);
    setPhase("playing");
  }, []);

  const doJump = useCallback(() => {
    if (phaseRef.current === "playing" && worldRef.current) {
      jump(worldRef.current);
    } else {
      start();
    }
  }, [start]);

  const doDash = useCallback(() => {
    if (phaseRef.current === "playing" && worldRef.current) {
      dash(worldRef.current);
    }
  }, []);

  // Keyboard — edge-triggered (one jump/dash per press).
  useEffect(() => {
    const seen = new Set<string>();
    const onDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === " " || k === "z" || k === "Z" || k === "ArrowUp") {
        if (!seen.has("jump")) {
          seen.add("jump");
          doJump();
        }
        e.preventDefault();
      } else if (k === "x" || k === "X" || k === "Shift") {
        if (!seen.has("dash")) {
          seen.add("dash");
          doDash();
        }
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === " " || k === "z" || k === "Z" || k === "ArrowUp")
        seen.delete("jump");
      else if (k === "x" || k === "X" || k === "Shift") seen.delete("dash");
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [doJump, doDash]);

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

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastRef.current = ts;

      const playing = phaseRef.current === "playing";
      const world = worldRef.current;

      if (playing && world) {
        updateWorld(world, dt);
        hillsRef.current -= world.speed * 0.25 * dt;
        if (world.dead) {
          const s = scoreOf(world);
          setScore(s);
          setBest((b) => {
            const nb = Math.max(b, s);
            localStorage.setItem(BEST_KEY, String(nb));
            return nb;
          });
          setDeathLine(
            DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)],
          );
          setPhase("dead");
        } else if (Math.random() < 0.2) {
          setScore(scoreOf(world));
        }
      } else {
        hillsRef.current -= 40 * dt;
      }

      draw(ctx, world, hillsRef.current, playing);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between font-mono text-sm">
        <span className="text-muted">
          Distance{" "}
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
        className="relative overflow-hidden rounded-2xl border border-border shadow-[0_0_80px_-30px_var(--color-accent)]"
        style={{ aspectRatio: `${VIRT.W} / ${VIRT.H}`, touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Tap-to-jump surface while playing */}
        {phase === "playing" && (
          <button
            aria-label="Jump"
            className="absolute inset-0 cursor-pointer"
            onPointerDown={(e) => {
              e.preventDefault();
              doJump();
            }}
          />
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm">
            {phase === "menu" ? (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                  Endless runner
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  Robo Pig Attack
                </h2>
                <p className="mt-3 max-w-sm text-center text-sm text-muted">
                  A winged robo-pig runs forever. Jump the gaps, flap to
                  double-jump, and dash to smash the crystals. How far can you
                  fly?
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                  The dream ends
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  {score} <span className="text-muted">m</span>
                </h2>
                {score >= best && score > 0 ? (
                  <p className="mt-1 text-sm text-accent">New best! 🐷✨</p>
                ) : (
                  <p className="mt-2 max-w-xs text-center text-sm italic text-muted">
                    “{deathLine}”
                  </p>
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
              {phase === "menu" ? "Start running" : "Run again"}
            </button>
          </div>
        )}
      </div>

      {/* Touch controls */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
        <button
          aria-label="Jump"
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-4 text-sm font-medium active:bg-surface-2"
          onPointerDown={(e) => {
            e.preventDefault();
            doJump();
          }}
        >
          <ArrowUp className="size-5" />
          Jump / Flap
        </button>
        <button
          aria-label="Dash"
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-4 text-sm font-medium active:bg-surface-2"
          onPointerDown={(e) => {
            e.preventDefault();
            doDash();
          }}
        >
          <Zap className="size-5" />
          Dash
        </button>
      </div>

      <p className="mt-4 hidden text-center font-mono text-xs text-faint sm:block">
        Space / Z / ↑ to jump (press again to flap) · X / Shift to dash · gaps
        and crystals are generated so a clearable path always exists
      </p>
    </div>
  );
}

// --------------------------------------------------------------------------
// Canvas drawing
// --------------------------------------------------------------------------
function draw(
  ctx: CanvasRenderingContext2D,
  world: World | null,
  hills: number,
  playing: boolean,
) {
  // Dreamy gradient sky.
  const sky = ctx.createLinearGradient(0, 0, 0, VIRT.H);
  sky.addColorStop(0, "#1b1140");
  sky.addColorStop(0.55, "#3a1d5e");
  sky.addColorStop(1, "#7a2d6b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIRT.W, VIRT.H);

  // Big soft moon.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffd9f0";
  ctx.shadowColor = "#ff9fe0";
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.arc(760, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Parallax hills (two rolling layers).
  drawHills(ctx, hills * 0.6, 430, "#2a1550", 120);
  drawHills(ctx, hills, 470, "#3d1f63", 90);

  if (!world) {
    if (!playing) drawPig(ctx, PIG.X, 360, 0, false, 0);
    return;
  }

  // Platforms.
  for (const p of world.platforms) {
    drawPlatform(ctx, p.x, p.top, p.w);
  }

  // Crystal obstacles.
  for (const o of world.obstacles) {
    if (!o.dead) drawCrystal(ctx, o.x, o.top);
  }

  // Rainbow dash trail.
  if (world.dashTimer > 0) drawTrail(ctx, PIG.X, world.pigY - PIG.H / 2);

  drawPig(ctx, PIG.X, world.pigY, world.flapPhase, !world.grounded, world.vy);
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  offset: number,
  baseY: number,
  color: string,
  amp: number,
) {
  const span = 240;
  const start = (offset % span) - span;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start, VIRT.H);
  for (let x = start; x <= VIRT.W + span; x += span) {
    ctx.quadraticCurveTo(x + span / 2, baseY - amp, x + span, baseY);
  }
  ctx.lineTo(VIRT.W, VIRT.H);
  ctx.closePath();
  ctx.fill();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  w: number,
) {
  // Body.
  ctx.fillStyle = "#241038";
  ctx.fillRect(x, top, w, VIRT.H - top);
  // Glowing top surface.
  ctx.fillStyle = "#ff5db1";
  ctx.shadowColor = "#ff5db1";
  ctx.shadowBlur = 14;
  ctx.fillRect(x, top, w, 5);
  ctx.shadowBlur = 0;
  // Subtle grid texture.
  ctx.strokeStyle = "rgba(255,93,177,0.12)";
  ctx.lineWidth = 1;
  for (let gx = x + 24; gx < x + w; gx += 24) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 6);
    ctx.lineTo(gx, VIRT.H);
    ctx.stroke();
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, top: number) {
  const cx = x + OBST_W / 2;
  ctx.save();
  ctx.fillStyle = "#5fe6ff";
  ctx.shadowColor = "#5fe6ff";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(x + OBST_W, top + OBST_H * 0.35);
  ctx.lineTo(cx, top + OBST_H);
  ctx.lineTo(x, top + OBST_H * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const colors = ["#ff5d5d", "#ffb05d", "#ffe95d", "#5dff8f", "#5db1ff", "#b05dff"];
  for (let i = 0; i < colors.length; i++) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x - 60 - i * 14, y - 18 + i * 6, 16, 6);
  }
  ctx.globalAlpha = 1;
}

function drawPig(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  flapPhase: number,
  airborne: boolean,
  vy: number,
) {
  ctx.save();
  ctx.translate(x, feetY - PIG.H / 2);
  // Slight tilt based on vertical velocity for liveliness.
  ctx.rotate(clampNum(vy / 4000, -0.25, 0.25));

  const w = PIG.W;
  const h = PIG.H;
  const flap = Math.sin(flapPhase) * (airborne ? 12 : 5);

  // Wing (behind body).
  ctx.fillStyle = "#e9e6ff";
  ctx.shadowColor = "#c9c4ff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.1);
  ctx.quadraticCurveTo(-w * 0.5, -h * 0.6 - flap, -w * 0.55, -h * 0.1 - flap);
  ctx.quadraticCurveTo(-w * 0.4, h * 0.05, -w * 0.1, h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Body.
  ctx.fillStyle = "#ff86c2";
  roundRect(ctx, -w * 0.35, -h * 0.4, w * 0.8, h * 0.8, 12);
  ctx.fill();

  // Snout.
  ctx.fillStyle = "#ff6fb0";
  roundRect(ctx, w * 0.28, -h * 0.12, w * 0.2, h * 0.28, 5);
  ctx.fill();
  ctx.fillStyle = "#9c3b73";
  ctx.beginPath();
  ctx.arc(w * 0.36, h * 0.02, 2.2, 0, Math.PI * 2);
  ctx.arc(w * 0.44, h * 0.02, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Ear.
  ctx.fillStyle = "#ff6fb0";
  ctx.beginPath();
  ctx.moveTo(w * 0.06, -h * 0.4);
  ctx.lineTo(w * 0.2, -h * 0.62);
  ctx.lineTo(w * 0.24, -h * 0.34);
  ctx.closePath();
  ctx.fill();

  // Eye.
  ctx.fillStyle = "#1b1140";
  ctx.beginPath();
  ctx.arc(w * 0.16, -h * 0.12, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Little metallic leg hint.
  ctx.fillStyle = "#b9b4e6";
  ctx.fillRect(-w * 0.18, h * 0.34, 6, 6);
  ctx.fillRect(w * 0.05, h * 0.34, 6, 6);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clampNum(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
