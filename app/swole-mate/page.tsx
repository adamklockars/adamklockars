import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import Tamagotchi from "@/components/tamagotchi/Tamagotchi";

export const metadata: Metadata = {
  title: "Swole Mate — Adam Klockars",
  description:
    "A Tamagotchi-style handheld: keep a little guy alive by feeding and resting him, and grow his GAINS by working out — without starving him or letting him collapse from over-training.",
};

export default function SwoleMatePage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Swole Mate
        </h1>
        <p className="mt-3 max-w-md text-center text-muted">
          A handheld care-’em-up in the spirit of the old virtual pets. Feed him,
          rest him, and grind out reps for GAINS — just don’t let him starve or
          collapse from over-training. He keeps living while you’re away.
        </p>

        <div className="mt-12 w-full">
          <Tamagotchi />
        </div>
      </main>
    </>
  );
}
