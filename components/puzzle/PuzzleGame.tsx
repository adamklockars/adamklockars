/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Shuffle, RotateCcw } from "lucide-react";

// Reuse the collage's sample photos as puzzle pictures.
const PICTURES = [
  "/collage/photo-1.jpg",
  "/collage/photo-2.jpg",
  "/collage/photo-3.jpg",
  "/collage/photo-4.jpg",
  "/collage/photo-5.jpg",
  "/collage/photo-6.jpg",
];
const SIZES = [3, 4, 5] as const;
const BEST_KEY = "puzzle:best";

type Loc = number | "tray"; // slot index, or in the tray

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function PuzzleGame() {
  const [src, setSrc] = useState(PICTURES[0]);
  const [n, setN] = useState<(typeof SIZES)[number]>(3);
  const [locations, setLocations] = useState<Loc[]>([]); // by piece id
  const [order, setOrder] = useState<number[]>([]); // stable tray order
  const [activeId, setActiveId] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [best, setBest] = useState<Record<number, number>>({});

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardPx, setBoardPx] = useState(360);

  const count = n * n;
  const solved = locations.length > 0 && locations.every((loc, id) => loc === id);

  const reset = useCallback((size: number, pic: string) => {
    const ids = Array.from({ length: size * size }, (_, i) => i);
    setLocations(ids.map(() => "tray"));
    setOrder(shuffle(ids));
    setMoves(0);
    setStartedAt(null);
    setSolvedAt(null);
    setActiveId(null);
    void pic;
  }, []);

  // Start / restart whenever the picture or size changes.
  useEffect(() => {
    reset(n, src);
  }, [n, src, reset]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBest(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Record a best (fewest moves) per grid size on solve.
  useEffect(() => {
    if (!solved || solvedAt) return;
    setSolvedAt(Date.now());
    setBest((prev) => {
      const cur = prev[n];
      if (cur != null && cur <= moves) return prev;
      const next = { ...prev, [n]: moves };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [solved, solvedAt, n, moves]);

  // Live timer while a puzzle is in progress (kept in state so render stays pure).
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!startedAt || solvedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [startedAt, solvedAt]);

  // Track the board's pixel size so the drag overlay matches the slots.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoardPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const slotPx = boardPx / n;

  const placedAt = (slot: number): number | null => {
    const id = locations.findIndex((loc) => loc === slot);
    return id === -1 ? null : id;
  };

  const onDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.data.current?.id as number);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const id = e.active.data.current?.id as number;
    const over = e.over?.id as string | undefined;
    if (id == null || !over) return;

    const from = locations[id];
    const next = [...locations];
    if (over === "tray") {
      if (from === "tray") return;
      next[id] = "tray";
    } else if (over.startsWith("slot:")) {
      const slot = Number(over.slice(5));
      if (from === slot) return;
      const occupant = next.findIndex((loc) => loc === slot);
      next[id] = slot;
      if (occupant !== -1) next[occupant] = from; // swap
    } else {
      return;
    }
    setLocations(next);
    setMoves((m) => m + 1);
    if (startedAt == null) setStartedAt(Date.now());
  };

  const elapsed = !startedAt
    ? 0
    : solvedAt
      ? Math.round((solvedAt - startedAt) / 1000)
      : Math.max(0, Math.round((now - startedAt) / 1000));

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            Picture
          </span>
          {PICTURES.map((p) => (
            <button
              key={p}
              onClick={() => setSrc(p)}
              aria-label="Choose picture"
              className={`size-9 overflow-hidden rounded-md border transition-all ${
                p === src ? "border-accent ring-2 ring-accent/40" : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <img src={p} alt="" className="size-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setN(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                s === n ? "bg-accent text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          {/* Board */}
          <div>
            <div
              ref={boardRef}
              className="relative grid w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-surface"
              style={{
                aspectRatio: "1 / 1",
                gridTemplateColumns: `repeat(${n}, 1fr)`,
              }}
            >
              {Array.from({ length: count }, (_, slot) => (
                <Slot key={slot} slot={slot} n={n}>
                  {(() => {
                    const id = placedAt(slot);
                    return id == null ? null : (
                      <Piece id={id} n={n} src={src} fill correct={id === slot} hidden={activeId === id} />
                    );
                  })()}
                </Slot>
              ))}

              {solved && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Solved</p>
                  <p className="mt-1 font-display text-3xl font-bold">Nice!</p>
                  <p className="mt-1 text-sm text-muted">
                    {moves} moves · {elapsed}s
                  </p>
                  <button
                    onClick={() => reset(n, src)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    <Shuffle className="size-4" />
                    Shuffle again
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-muted">
              <span>Moves <span className="text-foreground">{moves}</span></span>
              <span>Time <span className="text-foreground">{elapsed}s</span></span>
              {best[n] != null && <span>Best <span className="text-accent">{best[n]} moves</span></span>}
              <button onClick={() => reset(n, src)} className="ml-auto inline-flex items-center gap-1.5 text-muted hover:text-foreground">
                <RotateCcw className="size-3.5" /> Reshuffle
              </button>
            </div>
          </div>

          {/* Tray */}
          <Tray>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
              Drag pieces into place
            </p>
            <div className="flex flex-wrap gap-2" style={{ maxWidth: 4 * 60 }}>
              {order
                .filter((id) => locations[id] === "tray")
                .map((id) => (
                  <div key={id} style={{ width: Math.min(slotPx, 64), height: Math.min(slotPx, 64) }}>
                    <Piece id={id} n={n} src={src} fill hidden={activeId === id} />
                  </div>
                ))}
              {locations.every((l) => l !== "tray") && !solved && (
                <p className="text-sm text-faint">All pieces placed — fix the wrong ones.</p>
              )}
            </div>
          </Tray>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeId != null ? (
            <div style={{ width: slotPx, height: slotPx }}>
              <Piece id={activeId} n={n} src={src} fill overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Tray({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <aside
      ref={setNodeRef}
      className={`rounded-2xl border p-3 transition-colors sm:w-[260px] ${
        isOver ? "border-accent/50 bg-accent/5" : "border-border bg-surface"
      }`}
    >
      {children}
    </aside>
  );
}

function Slot({ slot, n, children }: { slot: number; n: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot}` });
  const row = Math.floor(slot / n);
  const col = slot % n;
  return (
    <div
      ref={setNodeRef}
      className={`relative ${isOver ? "z-10" : ""}`}
      style={{
        aspectRatio: "1 / 1",
        boxShadow: `inset 0 0 0 1px var(--color-border)`,
        background: (row + col) % 2 ? "rgba(255,255,255,0.02)" : "transparent",
        outline: isOver ? "2px solid var(--color-accent)" : "none",
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
}

function Piece({
  id,
  n,
  src,
  fill,
  correct,
  hidden,
  overlay,
}: {
  id: number;
  n: number;
  src: string;
  fill?: boolean;
  correct?: boolean;
  hidden?: boolean;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `piece:${id}`,
    data: { id },
  });
  const row = Math.floor(id / n);
  const col = id % n;

  const face: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${src})`,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${(col / (n - 1)) * 100}% ${(row / (n - 1)) * 100}%`,
  };

  if (overlay) {
    return <div style={{ ...face, borderRadius: 4 }} className="shadow-2xl ring-1 ring-black/30" />;
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        ...face,
        opacity: hidden || isDragging ? 0.25 : 1,
        cursor: "grab",
        borderRadius: fill ? 0 : 4,
      }}
      className={`touch-none select-none ${correct ? "ring-2 ring-emerald-400/70 ring-inset" : ""}`}
      aria-label={`Puzzle piece ${id + 1}`}
    />
  );
}
