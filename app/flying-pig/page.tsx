import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import FlyingPig from "@/components/flyingpig/FlyingPig";

export const metadata: Metadata = {
  title: "Robo Pig Attack — Adam Klockars",
  description:
    "An endless auto-runner in the spirit of Robot Unicorn Attack — but the unicorn is a winged robo-pig. Jump the gaps, flap to double-jump, and dash through crystals.",
};

export default function FlyingPigPage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Robo Pig Attack
        </h1>
        <p className="mt-3 max-w-md text-center text-muted">
          A loving riff on Robot Unicorn Attack — only here the galloping
          unicorn is a winged robo-pig. Hold onto your dreams and run forever.
        </p>

        <div className="mt-12 w-full">
          <FlyingPig />
        </div>
      </main>
    </>
  );
}
