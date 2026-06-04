// Game logic for "Swole Mate" — a Tamagotchi-style handheld pet. You keep a
// little guy alive by feeding him and letting him rest, and you grow his GAINS
// by making him work out. Lots of button-clicking, lots of time, no real
// reward beyond a bigger number and a pet that hasn't died of hunger or
// collapsed from over-training.
//
// Two ways to die, exactly as the old handheld had it:
//   - HUNGER: neglect feeding and he starves (after a short grace period).
//   - EXHAUSTION: work out with no energy left and he collapses.
// Energy only comes back from resting (and a little from food), so the loop is
// train → tire out → eat & sleep → train again.

export const MAX = 100;

export type Cause = "hunger" | "exhaustion" | null;

export type Pet = {
  hunger: number; // 0 (empty) .. 100 (full)
  energy: number; // 0 (spent) .. 100 (rested)
  strength: number; // "GAINS" — the number that only ever goes up
  ageSec: number; // total time alive
  sleeping: boolean;
  alive: boolean;
  cause: Cause;
  starveTimer: number; // seconds spent at zero hunger
};

// Live (tab-open) rates, per second.
const HUNGER_DECAY_AWAKE = 0.25;
const HUNGER_DECAY_SLEEP = 0.15;
const ENERGY_DRAIN_AWAKE = 0.08; // being awake slowly tires him
const ENERGY_REGEN_SLEEP = 9; // sleeping recovers energy fast
const STARVE_GRACE = 15; // seconds at 0 hunger before he starves

// Action effects.
export const FEED_HUNGER = 18;
export const FEED_ENERGY = 3;
export const TRAIN_ENERGY = 12;
export const TRAIN_HUNGER = 6;
export const TRAIN_GAIN = 1;

export function createPet(): Pet {
  return {
    hunger: 70,
    energy: 80,
    strength: 0,
    ageSec: 0,
    sleeping: false,
    alive: true,
    cause: null,
    starveTimer: 0,
  };
}

/** Advance the pet by `dt` seconds of live (tab-open) time. Mutates + returns. */
export function tickLive(p: Pet, dt: number): Pet {
  if (!p.alive) return p;

  p.ageSec += dt;

  p.hunger = Math.max(
    0,
    p.hunger - (p.sleeping ? HUNGER_DECAY_SLEEP : HUNGER_DECAY_AWAKE) * dt,
  );

  if (p.sleeping) {
    p.energy = Math.min(MAX, p.energy + ENERGY_REGEN_SLEEP * dt);
  } else {
    // Awake: energy only trickles down (it comes back from resting/food).
    p.energy = Math.max(0, p.energy - ENERGY_DRAIN_AWAKE * dt);
  }

  // Starvation: a short grace at empty, then he's gone.
  if (p.hunger <= 0) {
    p.starveTimer += dt;
    if (p.starveTimer >= STARVE_GRACE) {
      p.alive = false;
      p.cause = "hunger";
    }
  } else {
    p.starveTimer = 0;
  }

  return p;
}

/** Feed him. No-op while asleep or dead. */
export function feed(p: Pet): Pet {
  if (!p.alive || p.sleeping) return p;
  p.hunger = Math.min(MAX, p.hunger + FEED_HUNGER);
  p.energy = Math.min(MAX, p.energy + FEED_ENERGY);
  return p;
}

/** One workout rep. Grows GAINS but burns energy — and at zero energy, a rep
 *  is the rep that kills him (collapse from over-training). */
export function train(p: Pet): Pet {
  if (!p.alive || p.sleeping) return p;
  if (p.energy <= 0) {
    p.alive = false;
    p.cause = "exhaustion";
    return p;
  }
  p.strength += TRAIN_GAIN;
  p.energy = Math.max(0, p.energy - TRAIN_ENERGY);
  p.hunger = Math.max(0, p.hunger - TRAIN_HUNGER);
  return p;
}

/** Toggle sleep (the only way to recover energy quickly). */
export function toggleRest(p: Pet): Pet {
  if (!p.alive) return p;
  p.sleeping = !p.sleeping;
  return p;
}

// Away (tab-closed) time is gentle and never fatal: he gets very hungry but
// won't die while you're gone — and he rests up a little. Death only happens
// during live play, so a casual visitor never returns to a corpse.
export function applyAway(p: Pet, seconds: number): Pet {
  if (!p.alive) return p;
  const s = Math.min(Math.max(0, seconds), 86400); // cap at a day
  p.ageSec += s;
  p.hunger = Math.max(8, p.hunger - s * 0.05);
  p.energy = Math.min(70, p.energy + s * 0.2);
  p.starveTimer = 0;
  p.sleeping = false;
  return p;
}

// --- Flavor helpers -------------------------------------------------------

const RANKS: { at: number; name: string }[] = [
  { at: 0, name: "Couch Potato" },
  { at: 10, name: "Rookie" },
  { at: 25, name: "Fit" },
  { at: 50, name: "Buff" },
  { at: 100, name: "Swole" },
  { at: 200, name: "Beast" },
  { at: 350, name: "Hercules" },
  { at: 600, name: "Legend" },
];

export function rank(strength: number): { name: string; level: number } {
  let level = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (strength >= RANKS[i].at) level = i;
  }
  return { name: RANKS[level].name, level };
}

/** Short status line for the LCD. */
export function status(p: Pet): string {
  if (!p.alive) {
    return p.cause === "hunger" ? "Starved…" : "Collapsed…";
  }
  if (p.sleeping) return "Zzz…";
  if (p.hunger <= 0) return "STARVING!";
  if (p.energy <= 0) return "Exhausted!";
  if (p.hunger < 25) return "Hungry…";
  if (p.energy < 25) return "Tired…";
  if (p.strength > 0 && p.strength % 25 === 0) return "GAINS!";
  return "Feelin' good!";
}

export function formatAge(sec: number): string {
  const s = Math.floor(sec);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
