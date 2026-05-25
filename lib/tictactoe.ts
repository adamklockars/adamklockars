// Game logic ported from the original Django app (legacy/tictactoe/models.py).
// Pure functions, no server, no persistence required.

export type Mark = "X" | "O";
export type Cell = Mark | "";
export type Board = Cell[]; // length 9, index 0..8 left-to-right, top-to-bottom

export const EMPTY_BOARD: Board = Array(9).fill("") as Board;

// Same eight winning sets as the original implementation.
const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function getOpenMoves(board: Board): number[] {
  return board.flatMap((cell, i) => (cell === "" ? [i] : []));
}

/** The three indices of the winning line, or null if there's no winner yet. */
export function getWinningLine(board: Board): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

export type Result = Mark | "draw" | null;

/** Returns the winning mark, "draw" on a full board, or null while in play. */
export function getWinner(board: Board): Result {
  const line = getWinningLine(board);
  if (line) return board[line[0]] as Mark;
  if (getOpenMoves(board).length === 0) return "draw";
  return null;
}

export function whoseTurn(board: Board): Mark {
  // X always moves first; turns alternate by parity of filled cells.
  const filled = board.filter((c) => c !== "").length;
  return filled % 2 === 0 ? "X" : "O";
}

/** The original "AI": pick a uniformly random open square. */
export function randomMove(board: Board): number | null {
  const open = getOpenMoves(board);
  if (open.length === 0) return null;
  return open[Math.floor(Math.random() * open.length)];
}

export function applyMove(board: Board, index: number, mark: Mark): Board {
  if (board[index] !== "") return board;
  const next = board.slice();
  next[index] = mark;
  return next;
}
