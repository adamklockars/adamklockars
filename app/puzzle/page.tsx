import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import PuzzleGame from "@/components/puzzle/PuzzleGame";

export const metadata: Metadata = {
  title: "Picture Puzzle — Adam Klockars",
  description:
    "A drag-and-drop jigsaw: slice a picture into a grid, then drag the scattered pieces into their slots to complete the image. Built on the same drag-and-drop as the collage tool.",
};

export default function PuzzlePage() {
  return (
    <>
      <DemoNav />
      <main
        style={{ ["--color-accent" as string]: "#f59e0b" }}
        className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-16"
      >
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Picture Puzzle
        </h1>
        <p className="mt-3 hidden max-w-md text-center text-muted sm:block">
          A drag-and-drop jigsaw, built on the same drag-and-drop engine as the
          collage tool. Pick a picture and a grid size, then drag the scattered
          pieces into their slots to complete the image.
        </p>

        <div className="mt-8 w-full sm:mt-12">
          <PuzzleGame />
        </div>
      </main>
    </>
  );
}
