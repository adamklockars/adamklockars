import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import TicTacToe from "@/components/tictactoe/TicTacToe";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe — Adam Klockars",
  description:
    "A browser rebuild of the tic-tac-toe game from the original site. Play a friend or a (naive) computer.",
};

export default function TicTacToePage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Tic-Tac-Toe
        </h1>
        <p className="mt-3 max-w-md text-center text-muted">
          The old server-rendered game, rebuilt to run instantly in your browser.
        </p>

        <div className="mt-12 w-full max-w-sm">
          <TicTacToe />
        </div>
      </main>
    </>
  );
}
