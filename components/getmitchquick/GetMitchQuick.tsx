"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOODS,
  LOCATIONS,
  MAX_DAYS,
  CAPACITY,
  GUN_PRICE,
  ARMOR_PRICE,
  PATCH_PRICE,
  PATCH_HP,
  START_HP,
  type Game,
  newGame,
  buy,
  sell,
  buyGun,
  buyArmor,
  patchUp,
  payShark,
  travel,
  resolveCombat,
  resolveOffer,
  usedSpace,
  spaceLeft,
  netWorth,
} from "@/lib/getmitchquick";

type Panel = "market" | "travel" | "shop" | "shark";
const BEST_KEY = "getmitchquick-best";
const AMBER = "#ffb000";
const AMBER_DIM = "#a8741a";

export default function GetMitchQuick() {
  const [game, setGame] = useState<Game | null>(null);
  const [panel, setPanel] = useState<Panel>("market");
  const [best, setBest] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const recordedRef = useRef(false);

  // Start a game on mount + load best score.
  useEffect(() => {
    setGame(newGame());
    const b = Number(localStorage.getItem(BEST_KEY));
    if (Number.isFinite(b) && localStorage.getItem(BEST_KEY) !== null) setBest(b);
  }, []);

  // Keep the log scrolled to the latest line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [game]);

  // Record best net worth when a run ends.
  useEffect(() => {
    if (game?.over && !recordedRef.current) {
      recordedRef.current = true;
      const nw = netWorth(game);
      setBest((prev) => {
        const next = prev == null ? nw : Math.max(prev, nw);
        try {
          localStorage.setItem(BEST_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
  }, [game]);

  const restart = useCallback(() => {
    recordedRef.current = false;
    setGame(newGame());
    setPanel("market");
  }, []);

  if (!game) return null;
  const g = game;
  const apply = (fn: (g: Game) => Game) => setGame((cur) => (cur ? fn(cur) : cur));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className="relative overflow-hidden rounded-2xl border p-4 font-mono text-sm sm:p-6"
        style={{
          background:
            "repeating-linear-gradient(180deg,#0a0a06,#0a0a06 2px,#0c0c08 3px)",
          borderColor: "#3a2c10",
          color: AMBER,
          boxShadow: `0 0 80px -40px ${AMBER}, inset 0 0 60px -30px ${AMBER}`,
        }}
      >
        {/* Status */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b pb-3 text-xs sm:grid-cols-4" style={{ borderColor: "#3a2c10" }}>
          <Stat label="Day" value={`${g.day}/${MAX_DAYS}`} />
          <Stat label="Cash" value={`$${g.cash.toLocaleString()}`} />
          <Stat label="Debt" value={`$${g.debt.toLocaleString()}`} danger={g.debt > 0} />
          <Stat label="HP" value={`${g.hp}`} danger={g.hp <= 30} />
          <Stat label="Spot" value={LOCATIONS[g.location]} />
          <Stat label="Duffel" value={`${usedSpace(g)}/${CAPACITY}`} />
          <Stat label="Firepower" value={`${g.guns}`} />
          <Stat label="Padding" value={`${g.armor}`} />
        </div>

        {/* Main area */}
        <div className="mt-3 min-h-[210px]">
          {g.pending ? (
            <Encounter g={g} apply={apply} />
          ) : panel === "market" ? (
            <Market g={g} apply={apply} />
          ) : panel === "travel" ? (
            <Travel g={g} apply={apply} done={() => setPanel("market")} />
          ) : panel === "shop" ? (
            <Shop g={g} apply={apply} />
          ) : (
            <Shark g={g} apply={apply} />
          )}
        </div>

        {/* Action tabs */}
        {!g.pending && !g.over && (
          <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3" style={{ borderColor: "#3a2c10" }}>
            <Tab label="Market" active={panel === "market"} onClick={() => setPanel("market")} />
            <Tab label="Travel" active={panel === "travel"} onClick={() => setPanel("travel")} />
            <Tab label="Shop" active={panel === "shop"} onClick={() => setPanel("shop")} />
            <Tab label="Shark" active={panel === "shark"} onClick={() => setPanel("shark")} />
          </div>
        )}

        {/* Log */}
        <div
          ref={logRef}
          className="mt-3 h-24 overflow-y-auto border-t pt-2 text-xs leading-relaxed"
          style={{ borderColor: "#3a2c10", color: AMBER_DIM }}
        >
          {g.log.map((line, i) => (
            <div key={i} className={i === g.log.length - 1 ? "text-[color:var(--amber)]" : ""} style={{ ["--amber" as string]: AMBER }}>
              {line}
            </div>
          ))}
        </div>

        {/* Game over */}
        {g.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ background: "rgba(6,5,2,0.9)" }}>
            <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: g.won ? AMBER : "#ff5d5d" }}>
              {g.won ? "Retired" : "Busted"}
            </p>
            <h3 className="mt-2 font-mono text-2xl font-bold" style={{ color: AMBER }}>
              {g.won ? "You got out alive" : "Game Over"}
            </h3>
            <p className="mt-2 max-w-sm text-sm" style={{ color: AMBER_DIM }}>
              {g.cause}
            </p>
            <p className="mt-3 font-mono" style={{ color: AMBER }}>
              Final net worth: ${netWorth(g).toLocaleString()}
            </p>
            {best != null && (
              <p className="mt-1 text-xs" style={{ color: AMBER_DIM }}>
                Best: ${best.toLocaleString()}
              </p>
            )}
            <button
              onClick={restart}
              className="mt-5 rounded-full px-6 py-2.5 font-mono text-sm font-bold text-black transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: AMBER }}
            >
              New run
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center font-mono text-[11px] text-faint">
        Buy low, sell high, pay the shark, survive 30 days. A parody riff on the
        old Drug Lord / Drug Wars text traders.
      </p>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="truncate">
      <span style={{ color: AMBER_DIM }}>{label}: </span>
      <span style={{ color: danger ? "#ff6d6d" : AMBER }}>{value}</span>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded border px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors"
      style={{
        borderColor: "#3a2c10",
        background: active ? AMBER : "transparent",
        color: active ? "#000" : AMBER,
      }}
    >
      {label}
    </button>
  );
}

function ActBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border px-2 py-1 text-xs font-bold transition-colors disabled:opacity-30 enabled:hover:bg-[#ffb000] enabled:hover:text-black"
      style={{ borderColor: "#3a2c10", color: AMBER }}
    >
      {children}
    </button>
  );
}

function Market({ g, apply }: { g: Game; apply: (fn: (g: Game) => Game) => void }) {
  return (
    <div className="space-y-1.5">
      {GOODS.map((good, i) => {
        const price = g.market[i];
        const owned = g.coat[i];
        return (
          <div key={good.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b pb-1.5 text-xs" style={{ borderColor: "#241b0a" }}>
            <span className="w-32 truncate" style={{ color: AMBER }}>{good.name}</span>
            <span className="w-16" style={{ color: price == null ? "#6b5a2a" : AMBER }}>
              {price == null ? "—" : `$${price}`}
            </span>
            <span className="w-12" style={{ color: AMBER_DIM }}>×{owned}</span>
            <span className="ml-auto flex gap-1">
              <ActBtn onClick={() => apply((s) => buy(s, i, 1))} disabled={price == null}>+1</ActBtn>
              <ActBtn onClick={() => apply((s) => buy(s, i, 10))} disabled={price == null}>+10</ActBtn>
              <ActBtn onClick={() => apply((s) => buy(s, i, CAPACITY))} disabled={price == null}>Max</ActBtn>
              <ActBtn onClick={() => apply((s) => sell(s, i, 1))} disabled={owned === 0}>−1</ActBtn>
              <ActBtn onClick={() => apply((s) => sell(s, i, CAPACITY))} disabled={owned === 0}>Sell</ActBtn>
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-[11px]" style={{ color: AMBER_DIM }}>
        Space left: {spaceLeft(g)} · prices change every time you travel.
      </p>
    </div>
  );
}

function Travel({ g, apply, done }: { g: Game; apply: (fn: (g: Game) => Game) => void; done: () => void }) {
  return (
    <div>
      <p className="mb-2 text-xs" style={{ color: AMBER_DIM }}>
        Travelling burns a day (and the shark&apos;s interest). Pick a spot:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LOCATIONS.map((loc, i) => (
          <button
            key={loc}
            onClick={() => {
              apply((s) => travel(s, i));
              done();
            }}
            disabled={i === g.location}
            className="rounded border px-3 py-2 text-left text-xs font-bold transition-colors disabled:opacity-30 enabled:hover:bg-[#ffb000] enabled:hover:text-black"
            style={{ borderColor: "#3a2c10", color: AMBER }}
          >
            {loc}
            {i === g.location && " (here)"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Shop({ g, apply }: { g: Game; apply: (fn: (g: Game) => Game) => void }) {
  return (
    <div className="space-y-2 text-xs">
      <ShopRow
        label={`Piece (+1 firepower) — fight off busts`}
        price={GUN_PRICE}
        disabled={g.cash < GUN_PRICE}
        onClick={() => apply(buyGun)}
      />
      <ShopRow
        label={`Kevlar hoodie (+1 padding) — soak damage`}
        price={ARMOR_PRICE}
        disabled={g.cash < ARMOR_PRICE}
        onClick={() => apply(buyArmor)}
      />
      <ShopRow
        label={`Patch up (+${PATCH_HP} HP)`}
        price={PATCH_PRICE}
        disabled={g.cash < PATCH_PRICE || g.hp >= START_HP}
        onClick={() => apply(patchUp)}
      />
      <p className="pt-1 text-[11px]" style={{ color: AMBER_DIM }}>
        Stack all the gear you want. It still won&apos;t be enough.
      </p>
    </div>
  );
}

function ShopRow({ label, price, onClick, disabled }: { label: string; price: number; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "#241b0a" }}>
      <span className="flex-1" style={{ color: AMBER }}>{label}</span>
      <ActBtn onClick={onClick} disabled={disabled}>${price}</ActBtn>
    </div>
  );
}

function Shark({ g, apply }: { g: Game; apply: (fn: (g: Game) => Game) => void }) {
  return (
    <div className="text-xs">
      <p className="mb-2" style={{ color: AMBER_DIM }}>
        The loan shark adds 10% interest every day. Pay him down before it
        snowballs.
      </p>
      <p className="mb-3" style={{ color: AMBER }}>
        Owed: ${g.debt.toLocaleString()} · Cash: ${g.cash.toLocaleString()}
      </p>
      <div className="flex gap-2">
        <ActBtn onClick={() => apply((s) => payShark(s, 100))} disabled={g.debt === 0 || g.cash < 100}>Pay $100</ActBtn>
        <ActBtn onClick={() => apply((s) => payShark(s, 1000))} disabled={g.debt === 0 || g.cash < 100}>Pay $1,000</ActBtn>
        <ActBtn onClick={() => apply((s) => payShark(s, g.debt))} disabled={g.debt === 0 || g.cash <= 0}>Pay Max</ActBtn>
      </div>
    </div>
  );
}

function Encounter({ g, apply }: { g: Game; apply: (fn: (g: Game) => Game) => void }) {
  const p = g.pending!;
  if (p.kind === "cops") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-2xl">🚨</p>
        <p className="mt-1 font-bold" style={{ color: "#ff6d6d" }}>
          {p.foe} {p.foes > 1 ? `and crew (${p.foes})` : ""} are on you!
        </p>
        <p className="mt-1 text-xs" style={{ color: AMBER_DIM }}>
          Firepower {g.guns} · Padding {g.armor} · HP {g.hp}
        </p>
        <div className="mt-4 flex gap-3">
          <ActBtn onClick={() => apply((s) => resolveCombat(s, "fight"))}>Fight</ActBtn>
          <ActBtn onClick={() => apply((s) => resolveCombat(s, "run"))}>Run</ActBtn>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-2xl">🤝</p>
      <p className="mt-1 font-bold" style={{ color: AMBER }}>{p.label}</p>
      <p className="mt-1 text-sm" style={{ color: AMBER_DIM }}>
        ${p.price} for +1 {p.item === "armor" ? "padding" : "firepower"}
      </p>
      <div className="mt-4 flex gap-3">
        <ActBtn onClick={() => apply((s) => resolveOffer(s, true))} disabled={g.cash < p.price}>Buy</ActBtn>
        <ActBtn onClick={() => apply((s) => resolveOffer(s, false))}>Pass</ActBtn>
      </div>
    </div>
  );
}
