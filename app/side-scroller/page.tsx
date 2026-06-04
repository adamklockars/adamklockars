import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import SideScroller from "@/components/sidescroller/SideScroller";

export const metadata: Metadata = {
  title: "If Then Explosion — Adam Klockars",
  description:
    "A retro green cave-flyer rebuilt from the original Turing spaceship game. Thread a triangle ship through walls that pinch toward the centre while aliens squeeze the gap — the level always leaves a safe path.",
};

export default function SideScrollerPage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          If Then Explosion
        </h1>
        <p className="mt-3 hidden max-w-md text-center text-muted sm:block">
          A retro green cave-flyer, rebuilt from the triangle-ship game I first
          wrote in Turing. Thread the pinching cave, dodge the aliens.
        </p>

        <div className="mt-6 w-full sm:mt-12">
          <SideScroller />
        </div>
      </main>
    </>
  );
}
