/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Download, Plus, Trash2, X } from "lucide-react";

const ITEM_WIDTH = 150;
const MAX_CANVASES = 12;
const STORAGE_KEY = "collage:v1";

const SAMPLE_IMAGES = [
  "/collage/photo-1.jpg",
  "/collage/photo-2.jpg",
  "/collage/photo-3.jpg",
  "/collage/photo-4.jpg",
  "/collage/photo-5.jpg",
  "/collage/photo-6.jpg",
];

type PlacedImage = {
  id: string;
  src: string;
  x: number;
  y: number;
  z: number;
};

type Canvas = {
  id: string;
  name: string;
  items: PlacedImage[];
};

type Store = {
  canvases: Canvas[];
  activeId: string;
};

function makeCanvas(index: number): Canvas {
  return { id: crypto.randomUUID(), name: `Board ${index}`, items: [] };
}

function defaultStore(): Store {
  const first = makeCanvas(1);
  return { canvases: [first], activeId: first.id };
}

export default function CollageStudio() {
  const [store, setStore] = useState<Store>(defaultStore);
  const [zCounter, setZCounter] = useState(1);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Load saved boards once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Store;
      if (parsed?.canvases?.length) {
        setStore(parsed);
        const maxZ = Math.max(
          1,
          ...parsed.canvases.flatMap((c) => c.items.map((i) => i.z)),
        );
        setZCounter(maxZ + 1);
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const active = store.canvases.find((c) => c.id === store.activeId)!;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const updateActive = useCallback(
    (fn: (c: Canvas) => Canvas) => {
      setStore((s) => ({
        ...s,
        canvases: s.canvases.map((c) => (c.id === s.activeId ? fn(c) : c)),
      }));
    },
    [],
  );

  const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(value, Math.max(0, max)));

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (data?.type === "placed") {
      // bring the grabbed image to the front
      const id = data.id as string;
      const z = zCounter + 1;
      setZCounter(z);
      updateActive((c) => ({
        ...c,
        items: c.items.map((it) => (it.id === id ? { ...it, z } : it)),
      }));
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: act, over, delta } = e;
    const data = act.data.current;
    const rect = canvasRef.current?.getBoundingClientRect();

    if (data?.type === "tray") {
      if (over?.id !== "canvas" || !rect) return;
      const translated = act.rect.current.translated;
      if (!translated) return;
      const x = clamp(translated.left - rect.left, rect.width - ITEM_WIDTH);
      const y = clamp(translated.top - rect.top, rect.height - ITEM_WIDTH);
      const z = zCounter + 1;
      setZCounter(z);
      updateActive((c) => ({
        ...c,
        items: [
          ...c.items,
          { id: crypto.randomUUID(), src: data.src as string, x, y, z },
        ],
      }));
    } else if (data?.type === "placed" && rect) {
      const id = data.id as string;
      updateActive((c) => ({
        ...c,
        items: c.items.map((it) =>
          it.id === id
            ? {
                ...it,
                x: clamp(it.x + delta.x, rect.width - ITEM_WIDTH),
                y: clamp(it.y + delta.y, rect.height - ITEM_WIDTH),
              }
            : it,
        ),
      }));
    }
  };

  const removeItem = (id: string) =>
    updateActive((c) => ({ ...c, items: c.items.filter((i) => i.id !== id) }));

  const clearBoard = () => updateActive((c) => ({ ...c, items: [] }));

  const addCanvas = () =>
    setStore((s) => {
      if (s.canvases.length >= MAX_CANVASES) return s;
      const c = makeCanvas(s.canvases.length + 1);
      return { canvases: [...s.canvases, c], activeId: c.id };
    });

  const removeCanvas = (id: string) =>
    setStore((s) => {
      if (s.canvases.length <= 1) return s;
      const canvases = s.canvases.filter((c) => c.id !== id);
      const activeId = s.activeId === id ? canvases[0].id : s.activeId;
      return { canvases, activeId };
    });

  const exportPng = async () => {
    if (!canvasRef.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(canvasRef.current, {
      pixelRatio: 2,
      cacheBust: true,
    });
    const link = document.createElement("a");
    link.download = `${active.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        {/* Tray */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            Drag onto a board
          </p>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
            {SAMPLE_IMAGES.map((src) => (
              <TrayItem key={src} src={src} />
            ))}
          </div>
        </aside>

        {/* Board area */}
        <div>
          {/* Tabs */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {store.canvases.map((c) => {
              const isActive = c.id === store.activeId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center rounded-full border text-sm transition-colors ${
                    isActive
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() =>
                      setStore((s) => ({ ...s, activeId: c.id }))
                    }
                    className="py-1.5 pl-4 pr-2"
                  >
                    {c.name}
                  </button>
                  {store.canvases.length > 1 && (
                    <button
                      onClick={() => removeCanvas(c.id)}
                      aria-label={`Delete ${c.name}`}
                      className="px-2 py-1.5 text-faint hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={addCanvas}
              disabled={store.canvases.length >= MAX_CANVASES}
              aria-label="Add board"
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Canvas */}
          <CanvasArea ref={canvasRef} hasItems={active.items.length > 0}>
            {active.items.map((item) => (
              <PlacedItemView
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </CanvasArea>

          {/* Toolbar */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={exportPng}
              disabled={active.items.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-40"
            >
              <Download className="size-4" />
              Export PNG
            </button>
            <button
              onClick={clearBoard}
              disabled={active.items.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-40"
            >
              <Trash2 className="size-4" />
              Clear board
            </button>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function TrayItem({ src }: { src: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `tray:${src}`, data: { type: "tray", src } });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
      className={`touch-none overflow-hidden rounded-lg border border-border transition-opacity ${
        isDragging ? "opacity-80 shadow-2xl" : "hover:border-foreground/40"
      }`}
      aria-label="Drag image to board"
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="aspect-square w-full select-none object-cover"
      />
    </button>
  );
}

const CanvasArea = ({
  children,
  hasItems,
  ref,
}: {
  children: React.ReactNode;
  hasItems: boolean;
  ref: React.Ref<HTMLDivElement>;
}) => {
  const { setNodeRef } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-surface bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:22px_22px]"
    >
      {!hasItems && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-faint">Drag photos here to build a collage</p>
        </div>
      )}
      {children}
    </div>
  );
};

function PlacedItemView({
  item,
  onRemove,
}: {
  item: PlacedImage;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `item:${item.id}`, data: { type: "placed", id: item.id } });

  return (
    <div
      ref={setNodeRef}
      style={{
        left: item.x,
        top: item.y,
        width: ITEM_WIDTH,
        zIndex: isDragging ? 9999 : item.z,
        transform: CSS.Translate.toString(transform),
      }}
      className="group absolute touch-none"
    >
      <img
        {...listeners}
        {...attributes}
        src={item.src}
        alt=""
        draggable={false}
        className={`w-full cursor-grab select-none rounded-lg shadow-xl ring-1 ring-black/20 active:cursor-grabbing ${
          isDragging ? "shadow-2xl" : ""
        }`}
      />
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute -right-2 -top-2 hidden size-6 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border group-hover:flex"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
