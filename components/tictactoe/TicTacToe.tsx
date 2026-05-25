"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Settings2 } from "lucide-react";
import {
  type Board,
  type Mark,
  EMPTY_BOARD,
  applyMove,
  getWinner,
  getWinningLine,
  randomMove,
  whoseTurn,
} from "@/lib/tictactoe";

type Mode = "menu" | "playing";

export default function TicTacToe() {
  const [mode, setMode] = useState<Mode>("menu");
  const [vsComputer, setVsComputer] = useState(true);
  const [humanMark, setHumanMark] = useState<Mark>("X");

  const [board, setBoard] = useState<Board>(EMPTY_BOARD);

  const winner = getWinner(board);
  const winningLine = getWinningLine(board);
  const turn = whoseTurn(board);
  const computerMark: Mark = humanMark === "X" ? "O" : "X";
  const gameOver = winner !== null;

  const start = () => {
    setBoard(EMPTY_BOARD);
    setMode("playing");
  };

  const playAgain = () => setBoard(EMPTY_BOARD);

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameOver || board[index] !== "") return;
      // In vs-computer mode, ignore clicks while it's the computer's turn.
      if (vsComputer && turn === computerMark) return;
      setBoard((b) => applyMove(b, index, whoseTurn(b)));
    },
    [board, gameOver, vsComputer, turn, computerMark],
  );

  // Computer responds on its turn.
  useEffect(() => {
    if (!vsComputer || gameOver || turn !== computerMark) return;
    const id = setTimeout(() => {
      setBoard((b) => {
        if (getWinner(b) !== null) return b;
        const move = randomMove(b);
        return move === null ? b : applyMove(b, move, computerMark);
      });
    }, 450);
    return () => clearTimeout(id);
  }, [vsComputer, gameOver, turn, computerMark, board]);

  const status = (() => {
    if (winner === "draw") return "It's a draw.";
    if (winner) {
      if (vsComputer) return winner === humanMark ? "You win! 🎉" : "Computer wins.";
      return `${winner} wins!`;
    }
    if (vsComputer) return turn === humanMark ? "Your move" : "Computer thinking…";
    return `${turn} to move`;
  })();

  if (mode === "menu") {
    return (
      <Menu
        vsComputer={vsComputer}
        setVsComputer={setVsComputer}
        humanMark={humanMark}
        setHumanMark={setHumanMark}
        onStart={start}
      />
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* status */}
      <div className="mb-6 h-8 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-lg font-medium text-foreground"
          >
            {status}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* board */}
      <div className="grid aspect-square w-full max-w-sm grid-cols-3 gap-2.5">
        {board.map((cell, i) => {
          const inWin = winningLine?.includes(i);
          const disabled =
            gameOver ||
            cell !== "" ||
            (vsComputer && turn === computerMark);
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={disabled}
              aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
              className={`flex aspect-square items-center justify-center rounded-2xl border text-5xl font-bold transition-colors sm:text-6xl ${
                inWin
                  ? "border-accent/70 bg-accent/15"
                  : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-2"
              } ${disabled && cell === "" ? "cursor-default" : "cursor-pointer"}`}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className={
                      cell === "X" ? "text-accent" : "text-sky-400"
                    }
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* controls */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={playAgain}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
        >
          <RotateCcw className="size-4" />
          Play again
        </button>
        <button
          onClick={() => setMode("menu")}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          <Settings2 className="size-4" />
          Change settings
        </button>
      </div>
    </div>
  );
}

function Menu({
  vsComputer,
  setVsComputer,
  humanMark,
  setHumanMark,
  onStart,
}: {
  vsComputer: boolean;
  setVsComputer: (v: boolean) => void;
  humanMark: Mark;
  setHumanMark: (m: Mark) => void;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-border bg-surface p-7">
      <Field label="Opponent">
        <Segmented
          options={[
            { value: true, label: "Computer" },
            { value: false, label: "2 players" },
          ]}
          value={vsComputer}
          onChange={setVsComputer}
        />
      </Field>

      <Field label={vsComputer ? "You play" : "X goes first"}>
        <Segmented
          options={[
            { value: "X" as Mark, label: "X" },
            { value: "O" as Mark, label: "O" },
          ]}
          value={humanMark}
          onChange={setHumanMark}
        />
      </Field>

      <button
        onClick={onStart}
        className="mt-2 w-full rounded-full bg-accent px-6 py-3 font-medium text-background transition-transform hover:scale-[1.02] active:scale-95"
      >
        Start game
      </button>
      {vsComputer && humanMark === "O" && (
        <p className="mt-3 text-center text-xs text-muted">
          X moves first, so the computer will open.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Segmented<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`rounded-full py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
