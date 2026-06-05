import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import DamLevel from "@/components/damlevel/DamLevel";

export const metadata: Metadata = {
  title: "The Dam Level — Adam Klockars",
  description:
    "A homage to the infamous underwater dam level from the TMNT NES game: swim, defuse every bomb before the timer, and dodge the deadly electric seaweed. You only get four turtles.",
};

export default function DamLevelPage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          The Dam Level
        </h1>
        <p className="mt-3 hidden max-w-md text-center text-muted sm:block">
          A loving homage to the underwater dam stage that ended so many TMNT
          runs. Defuse every bomb before the dam blows, dodge the electric
          seaweed, and try not to lose all four turtles.
        </p>

        <div className="mt-6 w-full sm:mt-12">
          <DamLevel />
        </div>
      </main>
    </>
  );
}
