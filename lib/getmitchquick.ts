// Game logic for "Get Mitch Quick" — a parody remake of the old DOS text trader
// Drug Lord / Drug Wars. Same loop: travel between spots, buy low and sell high
// on wildly swinging prices, dodge (or fight) escalating cop busts, stock up on
// defensive gear that never quite saves you, and try to pay off the loan shark
// and get rich before the clock runs out. The market mixes the genre staples
// (cocaine, MDMA, magic mushrooms) with absurd contraband (Beanie Babies,
// bootleg DVDs, gas-station sushi) — the pricey stuff swings hardest.
//
// Pure logic: every transition takes a Game and returns a new Game (with a
// running log of the "funny scenarios in simple text"). The component just
// clicks buttons and renders.

export const MAX_DAYS = 30;
export const CAPACITY = 100; // duffel slots; 1 unit = 1 slot
export const START_CASH = 2000;
export const START_DEBT = 5500;
export const START_HP = 100;
export const DEBT_INTEREST = 0.1; // per day

export const GUN_PRICE = 350; // +1 firepower
export const ARMOR_PRICE = 280; // +1 padding (soaks damage)
export const PATCH_HP = 25;
export const PATCH_PRICE = 200;

// You can spend this far into the red. Handy — but the bank can call the
// overdraft at any time and seize your stash to settle it.
export const OVERDRAFT_LIMIT = 2000;
const OVERDRAFT_CALL_CHANCE = 0.16; // per travel, while you're overdrawn

export type GoodDef = { name: string; min: number; max: number; rare: number };

// Goods with different price ranges; `rare` = chance it's missing today. The
// high-value items (the drugs) swing hardest and are the riskiest to carry.
export const GOODS: GoodDef[] = [
  { name: "Cocaine", min: 250, max: 1500, rare: 0.3 },
  { name: "MDMA", min: 90, max: 650, rare: 0.25 },
  { name: "Magic Mushrooms", min: 40, max: 340, rare: 0.2 },
  { name: "Knockoff Kicks", min: 25, max: 280, rare: 0.2 },
  { name: "Fake Cologne", min: 40, max: 560, rare: 0.3 },
  { name: "Energy Drinks", min: 12, max: 140, rare: 0.15 },
  { name: "Beanie Babies", min: 10, max: 90, rare: 0.15 },
  { name: "Bootleg DVDs", min: 5, max: 45, rare: 0.1 },
  { name: "Gas-Station Sushi", min: 3, max: 30, rare: 0.1 },
];

export const LOCATIONS = [
  "Nuden",
  "Barefax",
  "Cuba",
  "Mexico",
  "Charlotte",
  "Vanier",
  "Casino",
];

export type Pending =
  | { kind: "cops"; foes: number; foe: string }
  | { kind: "offer"; item: "gun" | "armor"; price: number; label: string };

export type Game = {
  day: number;
  cash: number;
  debt: number;
  hp: number;
  guns: number;
  armor: number;
  coat: number[]; // qty owned per good index
  location: number;
  market: (number | null)[]; // today's price per good (null = unavailable)
  over: boolean;
  won: boolean;
  cause: string;
  log: string[];
  pending: Pending | null;
  rng: number;
};

// --- RNG (mutates g.rng) --------------------------------------------------
function rnd(g: Game): number {
  let a = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
const ri = (g: Game, lo: number, hi: number) =>
  lo + Math.floor(rnd(g) * (hi - lo + 1));
const pick = <T>(g: Game, arr: T[]): T => arr[Math.floor(rnd(g) * arr.length)];

// --- helpers --------------------------------------------------------------
export const usedSpace = (g: Game) => g.coat.reduce((a, b) => a + b, 0);
export const spaceLeft = (g: Game) => CAPACITY - usedSpace(g);
/** Spendable money, including the overdraft buffer. */
export const availableFunds = (g: Game) => g.cash + OVERDRAFT_LIMIT;

/** Value of the duffel at today's prices (avg mid-price when unavailable). */
export function stashValue(g: Game): number {
  let v = 0;
  for (let i = 0; i < GOODS.length; i++) {
    const price = g.market[i] ?? Math.round((GOODS[i].min + GOODS[i].max) / 2);
    v += g.coat[i] * price;
  }
  return v;
}
export const netWorth = (g: Game) => g.cash - g.debt + stashValue(g);

function clone(g: Game): Game {
  return { ...g, coat: [...g.coat], market: [...g.market], log: [...g.log] };
}
function log(g: Game, line: string) {
  g.log.push(line);
  if (g.log.length > 60) g.log.shift();
}

// --- setup ----------------------------------------------------------------
function rollMarket(g: Game) {
  const flavor: string[] = [];
  g.market = GOODS.map((good) => {
    if (rnd(g) < good.rare) return null;
    let price = ri(g, good.min, good.max);
    // Occasional spike / crash with a headline.
    const e = rnd(g);
    if (e < 0.06) {
      price = Math.round(good.max * (1.2 + rnd(g) * 0.8));
      flavor.push(`📈 ${good.name} are HOT right now — prices through the roof!`);
    } else if (e > 0.95) {
      price = Math.max(1, Math.round(good.min * 0.5));
      flavor.push(`📉 Someone flooded the market with ${good.name}. Dirt cheap!`);
    }
    return price;
  });
  flavor.forEach((f) => log(g, f));
}

export function newGame(seed = (Math.random() * 1e9) | 0): Game {
  const g: Game = {
    day: 1,
    cash: START_CASH,
    debt: START_DEBT,
    hp: START_HP,
    guns: 0,
    armor: 0,
    coat: GOODS.map(() => 0),
    location: 0,
    market: [],
    over: false,
    won: false,
    cause: "",
    log: [],
    pending: null,
    rng: seed >>> 0,
  };
  log(g, `Day 1 — you start in ${LOCATIONS[0]} with $${START_CASH} cash and a`);
  log(g, `$${START_DEBT} debt to a loan shark. 30 days. Get rich. Good luck.`);
  log(
    g,
    `Your account has a $${OVERDRAFT_LIMIT} overdraft — spend into the red, but`,
  );
  log(g, "the bank can call it and seize your stash at any time.");
  rollMarket(g);
  return g;
}

// --- trading --------------------------------------------------------------
export function buy(state: Game, i: number, qty: number): Game {
  const g = clone(state);
  const price = g.market[i];
  if (g.over || price == null || qty <= 0) return g;
  const affordable = Math.floor(availableFunds(g) / price);
  const n = Math.min(qty, affordable, spaceLeft(g));
  if (n <= 0) {
    log(g, n === 0 && affordable === 0 ? "You can't afford any." : "No room left in the duffel.");
    return g;
  }
  g.cash -= n * price;
  g.coat[i] += n;
  log(g, `Bought ${n} ${GOODS[i].name} @ $${price}.`);
  return g;
}

export function sell(state: Game, i: number, qty: number): Game {
  const g = clone(state);
  const price = g.market[i];
  if (g.over || price == null || qty <= 0) return g;
  const n = Math.min(qty, g.coat[i]);
  if (n <= 0) return g;
  g.cash += n * price;
  g.coat[i] -= n;
  log(g, `Sold ${n} ${GOODS[i].name} @ $${price}.`);
  return g;
}

// --- shop / shark ---------------------------------------------------------
export function buyGun(state: Game): Game {
  const g = clone(state);
  if (g.over || availableFunds(g) < GUN_PRICE) return g;
  g.cash -= GUN_PRICE;
  g.guns += 1;
  log(g, `Bought a piece. Firepower is now ${g.guns}.`);
  return g;
}
export function buyArmor(state: Game): Game {
  const g = clone(state);
  if (g.over || availableFunds(g) < ARMOR_PRICE) return g;
  g.cash -= ARMOR_PRICE;
  g.armor += 1;
  log(g, `Picked up a Kevlar hoodie. Padding is now ${g.armor}.`);
  return g;
}
export function patchUp(state: Game): Game {
  const g = clone(state);
  if (g.over || availableFunds(g) < PATCH_PRICE || g.hp >= START_HP) return g;
  g.cash -= PATCH_PRICE;
  g.hp = Math.min(START_HP, g.hp + PATCH_HP);
  log(g, `Patched up at the clinic. HP is now ${g.hp}.`);
  return g;
}
export function payShark(state: Game, amount: number): Game {
  const g = clone(state);
  if (g.over) return g;
  const pay = Math.min(amount, g.cash, g.debt);
  if (pay <= 0) return g;
  g.cash -= pay;
  g.debt -= pay;
  log(g, `Paid the loan shark $${pay}. Debt: $${g.debt}.`);
  if (g.debt === 0) log(g, "Debt cleared! The shark almost looks disappointed.");
  return g;
}

// --- travel + events ------------------------------------------------------
const THUGS = ["a Karen", "two mall cops", "the HOA president", "a rent-a-cop", "the Sushi Inspector"];

export function travel(state: Game, loc: number): Game {
  let g = clone(state);
  if (g.over || g.pending) return g;

  g.location = loc;
  g.day += 1;
  // Loan shark interest compounds daily.
  if (g.debt > 0) {
    const interest = Math.ceil(g.debt * DEBT_INTEREST);
    g.debt += interest;
  }
  log(g, `— Day ${g.day}: travelled to ${LOCATIONS[loc]}. —`);
  rollMarket(g);

  // Win check (survived all the days).
  if (g.day > MAX_DAYS) {
    g.over = true;
    g.won = true;
    g.cause = "You made it to the end. Time to retire.";
    return g;
  }

  // Roll a random road event.
  g = rollEvent(g);
  return g;
}

function rollEvent(g: Game): Game {
  // The bank can call your overdraft whenever you're in the red — they seize
  // the stash to settle up. You could lose it at any time.
  if (g.cash < 0 && rnd(g) < OVERDRAFT_CALL_CHANCE) {
    const seized = stashValue(g);
    g.coat = g.coat.map(() => 0);
    g.cash += seized; // liquidate the stash against the overdraft
    log(
      g,
      seized > 0
        ? `🏦 The bank CALLED your overdraft! They seized your whole stash (~$${seized}) to settle up.`
        : "🏦 The bank CALLED your overdraft! Nothing to seize — they just froze you in the red.",
    );
    return g;
  }

  const roll = rnd(g);
  const heat = g.day / MAX_DAYS; // 0..1, rises over time
  // The richer Mitch gets, the more heat he draws — big-time dealers get busted.
  const rep = Math.min(0.24, Math.max(0, netWorth(g)) / 85000);

  // Cops get more frequent and meaner as the days (and your rep) climb.
  if (roll < 0.22 + heat * 0.3 + rep) {
    const foes = 1 + Math.floor(rnd(g) * (1 + Math.floor(heat * 4 + rep * 7)));
    const foe = pick(g, THUGS);
    g.pending = { kind: "cops", foes, foe };
    log(g, `🚨 ${foe} ${foes > 1 ? "and friends" : ""} jumped you! (${foes} of them)`);
    return g;
  }
  if (roll < 0.4) {
    // Found a stash.
    const i = Math.floor(rnd(g) * GOODS.length);
    const n = Math.min(ri(g, 2, 8), spaceLeft(g));
    if (n > 0) {
      g.coat[i] += n;
      log(g, `🎁 You found ${n} ${GOODS[i].name} in a dumpster. Score!`);
    } else {
      log(g, "🎁 You found a stash but your duffel is full. Tragic.");
    }
    return g;
  }
  if (roll < 0.5 && g.cash > 50) {
    // Mugged.
    const loss = Math.round(g.cash * (0.1 + rnd(g) * 0.25));
    g.cash -= loss;
    log(g, `💸 ${pick(g, THUGS)} shook you down for $${loss}.`);
    return g;
  }
  if (roll < 0.62) {
    // Gear offer.
    const armor = rnd(g) < 0.5;
    const price = armor
      ? Math.round(ARMOR_PRICE * (0.7 + rnd(g) * 0.6))
      : Math.round(GUN_PRICE * (0.7 + rnd(g) * 0.6));
    g.pending = {
      kind: "offer",
      item: armor ? "armor" : "gun",
      price,
      label: armor
        ? "A guy by the fountain offers a slightly-used Kevlar hoodie"
        : "A trenchcoat guy flashes a piece for sale",
    };
    log(g, `🤝 ${g.pending.label} for $${price}.`);
    return g;
  }
  // Quiet day — a little flavor.
  log(
    g,
    pick(g, [
      "A quiet day. Somewhere, a mall fountain trickles.",
      "Nothing happened. You ate a pretzel.",
      "You overhear a tip about Fake Cologne. Probably nothing.",
      "The food court smells of destiny and Sbarro.",
    ]),
  );
  return g;
}

// --- combat resolution ----------------------------------------------------
function takeDamage(g: Game, foes: number) {
  // Late-game busts hit harder — by the end, no amount of Kevlar is enough.
  const perFoeMax = 14 + Math.floor(g.day / 2);
  let dmg = 0;
  for (let f = 0; f < foes; f++) dmg += ri(g, 5, perFoeMax);
  dmg = Math.max(0, dmg - g.armor * 3); // padding soaks some, but never all
  g.hp -= dmg;
  if (dmg > 0) log(g, `You took ${dmg} damage. HP: ${Math.max(0, g.hp)}.`);
  if (g.hp <= 0) {
    g.hp = 0;
    g.over = true;
    g.won = false;
    g.cause = "You got dropped. All the Kevlar in the world wasn't enough.";
    g.pending = null;
  }
}

/** Accept or decline a pending gear offer. */
export function resolveOffer(state: Game, accept: boolean): Game {
  const g = clone(state);
  const p = g.pending;
  if (g.over || !p || p.kind !== "offer") return g;
  if (!accept) {
    log(g, "You wave them off.");
    g.pending = null;
    return g;
  }
  if (availableFunds(g) < p.price) {
    log(g, "You're short on cash. They scoff and leave.");
    g.pending = null;
    return g;
  }
  g.cash -= p.price;
  if (p.item === "armor") {
    g.armor += 1;
    log(g, `Bought the hoodie. Padding is now ${g.armor}.`);
  } else {
    g.guns += 1;
    log(g, `Bought the piece. Firepower is now ${g.guns}.`);
  }
  g.pending = null;
  return g;
}

/** Resolve a pending combat round. choice: "fight" | "run". */
export function resolveCombat(state: Game, choice: "fight" | "run"): Game {
  const g = clone(state);
  const p = g.pending;
  if (g.over || !p || p.kind !== "cops") return g;

  if (choice === "fight") {
    const hitChance = Math.min(0.9, 0.32 + g.guns * 0.08);
    if (rnd(g) < hitChance) {
      p.foes -= 1;
      log(g, g.guns > 0 ? "Bang! You dropped one." : "You swung wild and decked one!");
      if (p.foes <= 0) {
        const bounty = ri(g, 80, 220) + g.day * 10;
        g.cash += bounty;
        log(g, `You fought them all off and grabbed $${bounty} they dropped.`);
        g.pending = null;
        return g;
      }
    } else {
      log(g, "You missed!");
    }
    takeDamage(g, p.foes);
    return g;
  }

  // Run.
  const escapeChance = Math.max(0.2, 0.7 - p.foes * 0.12);
  if (rnd(g) < escapeChance) {
    // Maybe drop some goods scrambling away.
    if (usedSpace(g) > 0 && rnd(g) < 0.5) {
      const owned = g.coat.flatMap((q, i) => (q > 0 ? [i] : []));
      const i = pick(g, owned);
      const drop = Math.min(g.coat[i], ri(g, 1, 5));
      g.coat[i] -= drop;
      log(g, `You got away — but dropped ${drop} ${GOODS[i].name} running.`);
    } else {
      log(g, "You slipped away clean. Heart pounding.");
    }
    g.pending = null;
    return g;
  }
  log(g, "You couldn't get away!");
  takeDamage(g, p.foes);
  if (!g.over && rnd(g) < 0.5) {
    log(g, "They lost interest and split.");
    g.pending = null;
  }
  return g;
}
