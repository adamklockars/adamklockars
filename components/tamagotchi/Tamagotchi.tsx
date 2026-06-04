"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drumstick, Dumbbell, Moon, RotateCcw } from "lucide-react";
import {
  MAX,
  type Pet,
  type Cause,
  createPet,
  tickLive,
  feed,
  train,
  toggleRest,
  applyAway,
  rank,
  status,
  formatAge,
} from "@/lib/tamagotchi";

const SAVE_KEY = "swolemate-save";
const REC_KEY = "swolemate-record";

// Game Boy LCD palette.
const LCD = {
  bg: "#9bbc0f",
  light: "#8bac0f",
  mid: "#306230",
  dark: "#0f380f",
};
const W = 256; // LCD internal resolution
const H = 208;

type Anim = { type: "idle" | "eat" | "train"; until: number };

type Saved = Pet & { lastSeen: number };

export default function Tamagotchi() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petRef = useRef<Pet>(createPet());
  const animRef = useRef<Anim>({ type: "idle", until: 0 });
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const hideAtRef = useRef<number>(0);
  const saveAccumRef = useRef<number>(0);

  // React mirror (canvas shows the live detail; these drive chrome + a11y).
  const [sleeping, setSleeping] = useState(false);
  const [alive, setAlive] = useState(true);
  const [death, setDeath] = useState<{
    cause: Cause;
    ageSec: number;
    strength: number;
  } | null>(null);
  const [readout, setReadout] = useState({ hunger: 70, energy: 80, strength: 0 });
  const [record, setRecord] = useState({ strength: 0, ageSec: 0 });

  const captureDeath = useCallback(() => {
    const p = petRef.current;
    setDeath({ cause: p.cause, ageSec: p.ageSec, strength: p.strength });
  }, []);

  const persist = useCallback(() => {
    const p = petRef.current;
    const saved: Saved = { ...p, lastSeen: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const bumpRecord = useCallback(() => {
    const p = petRef.current;
    setRecord((r) => {
      const next = {
        strength: Math.max(r.strength, p.strength),
        ageSec: Math.max(r.ageSec, p.ageSec),
      };
      try {
        localStorage.setItem(REC_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Load saved pet + record on mount, applying gentle "away" decay.
  useEffect(() => {
    try {
      const rec = localStorage.getItem(REC_KEY);
      if (rec) setRecord(JSON.parse(rec));
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        const { lastSeen, ...pet } = s;
        const away = (Date.now() - (lastSeen || Date.now())) / 1000;
        petRef.current = applyAway(pet as Pet, away);
        setSleeping(petRef.current.sleeping);
        setAlive(petRef.current.alive);
        if (!petRef.current.alive) captureDeath();
      }
    } catch {
      /* corrupt save — start fresh */
    }
  }, [captureDeath]);

  const restart = useCallback(() => {
    petRef.current = createPet();
    animRef.current = { type: "idle", until: 0 };
    setSleeping(false);
    setAlive(true);
    setDeath(null);
    persist();
  }, [persist]);

  // Actions.
  const doFeed = useCallback(() => {
    const p = petRef.current;
    if (!p.alive || p.sleeping) return;
    feed(p);
    animRef.current = { type: "eat", until: performance.now() + 600 };
    persist();
  }, [persist]);

  const doTrain = useCallback(() => {
    const p = petRef.current;
    if (!p.alive || p.sleeping) return;
    train(p);
    animRef.current = { type: "train", until: performance.now() + 500 };
    if (!p.alive) {
      setAlive(false);
      captureDeath();
      bumpRecord();
    }
    persist();
  }, [persist, bumpRecord, captureDeath]);

  const doRest = useCallback(() => {
    const p = petRef.current;
    if (!p.alive) return;
    toggleRest(p);
    setSleeping(p.sleeping);
    persist();
  }, [persist]);

  // Keyboard shortcuts: F feed, T/Space train, R rest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && e.key !== " ") return;
      if (e.key === "f" || e.key === "F") doFeed();
      else if (e.key === "t" || e.key === "T" || e.key === " ") {
        doTrain();
        e.preventDefault();
      } else if (e.key === "r" || e.key === "R") doRest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doFeed, doTrain, doRest]);

  // Away handling + save on tab hide/show.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hideAtRef.current = Date.now();
        persist();
      } else if (hideAtRef.current) {
        const away = (Date.now() - hideAtRef.current) / 1000;
        applyAway(petRef.current, away);
        setSleeping(petRef.current.sleeping);
        lastRef.current = 0; // avoid a giant dt on the next frame
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", persist);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", persist);
    };
  }, [persist]);

  // Simulation + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    let readoutAccum = 0;

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      const dt = Math.min(0.1, (ts - last) / 1000);
      lastRef.current = ts;

      const p = petRef.current;
      const wasAlive = p.alive;
      if (p.alive && !document.hidden) tickLive(p, dt);
      if (wasAlive && !p.alive) {
        setAlive(false);
        captureDeath();
        bumpRecord();
        persist();
      }

      // Throttle React readout + autosave.
      readoutAccum += dt;
      if (readoutAccum >= 0.4) {
        readoutAccum = 0;
        setReadout({
          hunger: Math.round(p.hunger),
          energy: Math.round(p.energy),
          strength: p.strength,
        });
      }
      saveAccumRef.current += dt;
      if (saveAccumRef.current >= 5) {
        saveAccumRef.current = 0;
        persist();
      }

      drawLCD(ctx, p, animRef.current, ts);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [persist, bumpRecord, captureDeath]);

  const r = rank(readout.strength);

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Handheld shell */}
      <div className="relative rounded-[2rem] border border-pink-300/20 bg-gradient-to-b from-pink-400 to-pink-500 p-5 pb-7 shadow-[0_20px_60px_-20px_rgba(244,114,182,0.6)]">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink-900/80">
            Swole&nbsp;Mate
          </span>
          <span className="size-2 rounded-full bg-pink-900/30" aria-hidden />
        </div>

        {/* LCD bezel */}
        <div className="rounded-2xl bg-[#0f380f] p-3 shadow-inner">
          <canvas
            ref={canvasRef}
            aria-label={`Swole Mate — hunger ${readout.hunger}, energy ${readout.energy}, gains ${readout.strength} (${r.name})`}
            className="block w-full rounded-md"
            style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
          />
        </div>

        {/* Buttons */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <PadButton
            label="Feed"
            sub="F"
            disabled={!alive || sleeping}
            onPress={doFeed}
          >
            <Drumstick className="size-5" />
          </PadButton>
          <PadButton
            label="Train"
            sub="T"
            disabled={!alive || sleeping}
            onPress={doTrain}
          >
            <Dumbbell className="size-5" />
          </PadButton>
          <PadButton
            label={sleeping ? "Wake" : "Rest"}
            sub="R"
            disabled={!alive}
            active={sleeping}
            onPress={doRest}
          >
            <Moon className="size-5" />
          </PadButton>
        </div>

        {/* Death overlay */}
        {!alive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] bg-black/65 backdrop-blur-sm">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-pink-300">
              R.I.P.
            </p>
            <p className="mt-2 max-w-[16rem] text-center text-sm text-white/90">
              {death?.cause === "hunger"
                ? "He starved. Feed him more often next time."
                : "He collapsed from over-training. Let him rest!"}
            </p>
            <p className="mt-1 text-xs text-white/60">
              Reached {rank(death?.strength ?? 0).name} · lived{" "}
              {formatAge(death?.ageSec ?? 0)}
            </p>
            <button
              onClick={restart}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-pink-400 px-6 py-2.5 text-sm font-medium text-pink-950 transition-transform hover:scale-[1.03] active:scale-95"
            >
              <RotateCcw className="size-4" />
              New guy
            </button>
          </div>
        )}
      </div>

      {/* Readout chips + record */}
      <div className="mt-5 grid grid-cols-3 gap-2 text-center font-mono text-xs">
        <Chip label="Hunger" value={`${readout.hunger}%`} />
        <Chip label="Energy" value={`${readout.energy}%`} />
        <Chip label="Gains" value={`${readout.strength}`} />
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-faint">
        Rank: <span className="text-foreground">{r.name}</span>
        {record.strength > 0 && (
          <> · best {record.strength} gains, {formatAge(record.ageSec)} alive</>
        )}
      </p>
      <p className="mt-2 text-center font-mono text-[11px] text-faint">
        Feed him, train for gains, rest before he drops. Keys: F / T / R.
      </p>
    </div>
  );
}

function PadButton({
  label,
  sub,
  children,
  onPress,
  disabled,
  active,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      disabled={disabled}
      aria-label={`${label} (${sub})`}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-bold uppercase tracking-wide transition-all active:translate-y-0.5 active:shadow-none ${
        active
          ? "border-pink-900/30 bg-pink-200 text-pink-900 shadow-[0_3px_0_rgba(0,0,0,0.25)]"
          : "border-pink-900/20 bg-pink-50 text-pink-900 shadow-[0_3px_0_rgba(0,0,0,0.25)]"
      } ${disabled ? "cursor-not-allowed opacity-40 shadow-none" : "hover:bg-white"}`}
    >
      {children}
      {label}
    </button>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2 py-2">
      <div className="text-[9px] uppercase tracking-widest text-faint">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

// --------------------------------------------------------------------------
// LCD rendering (Game Boy palette, chunky pixels)
// --------------------------------------------------------------------------
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function drawLCD(
  ctx: CanvasRenderingContext2D,
  p: Pet,
  anim: Anim,
  ts: number,
) {
  px(ctx, 0, 0, W, H, LCD.bg);

  // Stat bars (top).
  drawBar(ctx, 14, 14, "HUNGER", p.hunger);
  drawBar(ctx, 14, 34, "ENERGY", p.energy);

  // Rank + age (top-right).
  const rk = rank(p.strength);
  text(ctx, `Lv${rk.level} ${rk.name}`, W - 14, 14, LCD.dark, "right");
  text(ctx, `AGE ${formatAge(p.ageSec)}`, W - 14, 26, LCD.mid, "right");
  text(ctx, `GAINS ${p.strength}`, W - 14, 38, LCD.dark, "right");

  // Ground line.
  px(ctx, 0, 168, W, 3, LCD.mid);

  // The guy.
  const now = ts;
  const blink = Math.floor(now / 1700) % 10 === 0;
  const frame = Math.floor(now / 180) % 2;
  let pose: Anim["type"] | "sleep" | "dead" = "idle";
  if (!p.alive) pose = "dead";
  else if (p.sleeping) pose = "sleep";
  else if (anim.until > now) pose = anim.type;
  drawGuy(ctx, 128, 168, pose, frame, blink, rk.level);

  // Status line (bottom).
  text(ctx, status(p), 128, 192, LCD.dark, "center");
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: number,
) {
  text(ctx, label, x, y + 2, LCD.dark, "left");
  const bx = x + 56;
  const bw = 110;
  // Track.
  px(ctx, bx - 1, y - 2, bw + 2, 10, LCD.dark);
  px(ctx, bx, y - 1, bw, 8, LCD.light);
  // Fill (segmented).
  const fill = Math.round((Math.max(0, Math.min(MAX, value)) / MAX) * bw);
  const low = value < 25;
  for (let i = 0; i < fill; i += 6) {
    px(ctx, bx + i, y - 1, 5, 8, low ? LCD.mid : LCD.dark);
  }
}

// Minimal 3x5 pixel font for the LCD labels/numbers.
const FONT: Record<string, number[]> = {
  A: [0b111, 0b101, 0b111, 0b101, 0b101],
  B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b111, 0b100, 0b100, 0b100, 0b111],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b111, 0b100, 0b101, 0b101, 0b111],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b101, 0b111],
  K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b101, 0b111, 0b111, 0b111, 0b101],
  O: [0b111, 0b101, 0b101, 0b101, 0b111],
  P: [0b111, 0b101, 0b111, 0b100, 0b100],
  Q: [0b111, 0b101, 0b101, 0b111, 0b011],
  R: [0b111, 0b101, 0b110, 0b101, 0b101],
  S: [0b111, 0b100, 0b111, 0b001, 0b111],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  "0": [0b111, 0b101, 0b101, 0b101, 0b111],
  "1": [0b010, 0b110, 0b010, 0b010, 0b111],
  "2": [0b111, 0b001, 0b111, 0b100, 0b111],
  "3": [0b111, 0b001, 0b111, 0b001, 0b111],
  "4": [0b101, 0b101, 0b111, 0b001, 0b001],
  "5": [0b111, 0b100, 0b111, 0b001, 0b111],
  "6": [0b111, 0b100, 0b111, 0b101, 0b111],
  "7": [0b111, 0b001, 0b010, 0b010, 0b010],
  "8": [0b111, 0b101, 0b111, 0b101, 0b111],
  "9": [0b111, 0b101, 0b111, 0b001, 0b111],
  "!": [0b010, 0b010, 0b010, 0b000, 0b010],
  "…": [0b000, 0b000, 0b000, 0b000, 0b101],
  "·": [0b000, 0b000, 0b010, 0b000, 0b000],
  " ": [0, 0, 0, 0, 0],
};

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  color: string,
  align: "left" | "center" | "right" = "left",
) {
  const up = str.toUpperCase();
  const cw = 4; // 3px glyph + 1 spacing
  const width = up.length * cw;
  let sx = align === "left" ? x : align === "center" ? x - width / 2 : x - width;
  for (const ch of up) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 3; col++) {
        if (bits & (1 << (2 - col))) px(ctx, sx + col, y + row, 1, 1, color);
      }
    }
    sx += cw;
  }
}

// The guy, built from chunky blocks. `b` is the pixel size; he grows a little
// brawnier as his rank climbs.
function drawGuy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  pose: Anim["type"] | "sleep" | "dead",
  frame: number,
  blink: boolean,
  level: number,
) {
  const b = 5; // block size
  const D = LCD.dark;
  const M = LCD.mid;
  const brawn = Math.min(3, level) * b; // extra shoulder/arm width with rank

  if (pose === "sleep" || pose === "dead") {
    // Lying down: head left, body right, on the ground line.
    const y = baseY - 2 * b;
    px(ctx, cx - 5 * b, y, 4 * b, 3 * b, D); // head
    px(ctx, cx - b, y, 6 * b, 3 * b, M); // body
    if (pose === "dead") {
      // X eyes.
      px(ctx, cx - 4 * b, y + b, b, b, LCD.bg);
      px(ctx, cx - 2 * b, y + b, b, b, LCD.bg);
      // little halo
      px(ctx, cx - 4 * b, y - 2 * b, 3 * b, b, D);
    } else {
      // closed eye + Zzz drifting up.
      px(ctx, cx - 3 * b, y + b, 2 * b, 1, LCD.bg);
      const zf = (frame + Math.floor(performance.now() / 400)) % 3;
      text(ctx, "Z", cx + 5 * b, y - 2 * b - zf * b, D);
    }
    return;
  }

  const headY = baseY - 9 * b;
  const bodyY = baseY - 6 * b;
  const legY = baseY - 2 * b;

  // Legs.
  px(ctx, cx - 2 * b, legY, b, 2 * b, D);
  px(ctx, cx + b, legY, b, 2 * b, D);
  // Body (widens with brawn).
  px(ctx, cx - 2 * b - brawn / 2, bodyY, 4 * b + brawn, 4 * b, M);
  // Head.
  px(ctx, cx - 2 * b, headY, 4 * b, 3 * b, D);
  // Eyes.
  if (!blink) {
    px(ctx, cx - b, headY + b, b, b, LCD.bg);
    px(ctx, cx, headY + b, b, b, LCD.bg);
  } else {
    px(ctx, cx - b, headY + 1.5 * b, 2 * b, 1, LCD.bg);
  }

  if (pose === "train") {
    // Barbell overhead; alternate frame lowers it to the shoulders.
    const barY = frame === 0 ? headY - 2 * b : headY;
    // arms up
    px(ctx, cx - 3 * b - brawn / 2, bodyY - b, b, 2 * b, D);
    px(ctx, cx + 2 * b + brawn / 2, bodyY - b, b, 2 * b, D);
    px(ctx, cx - 6 * b, barY, 12 * b, b, D); // bar
    px(ctx, cx - 6 * b, barY - b, 2 * b, 3 * b, M); // left plate
    px(ctx, cx + 4 * b, barY - b, 2 * b, 3 * b, M); // right plate
  } else if (pose === "eat") {
    // Arms forward holding a drumstick to the mouth (chew on alt frame).
    px(ctx, cx + 2 * b + brawn / 2, bodyY, 2 * b, b, D); // arm
    const fy = frame === 0 ? headY + 2 * b : headY + 1.5 * b;
    px(ctx, cx + 3 * b, fy, b, b, M); // meat
    px(ctx, cx + 4 * b, fy - b, b, 2 * b, D); // bone
  } else {
    // Idle: arms at sides, slight bob handled by caller timing.
    px(ctx, cx - 3 * b - brawn / 2, bodyY, b, 3 * b, D);
    px(ctx, cx + 2 * b + brawn / 2, bodyY, b, 3 * b, D);
  }
}
