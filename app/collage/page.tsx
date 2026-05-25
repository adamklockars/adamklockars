import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import CollageStudio from "@/components/collage/CollageStudio";

export const metadata: Metadata = {
  title: "Collage Studio — Adam Klockars",
  description:
    "Drag photos onto a canvas, arrange them across multiple boards, and export as an image. A modern rebuild of the original Pinprint collage tool.",
};

export default function CollagePage() {
  return (
    <>
      <DemoNav />
      <main
        style={{ ["--color-accent" as string]: "#f59e0b" }}
        className="mx-auto max-w-5xl px-6 py-16"
      >
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Collage Studio
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          The old Pinprint tool, rebuilt with modern drag-and-drop. Build across
          multiple boards, then export your collage as an image. Everything is
          saved locally in your browser.
        </p>

        <div className="mt-12">
          <CollageStudio />
        </div>
      </main>
    </>
  );
}
