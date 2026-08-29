// Pure stat calculations over the locally stored game history — no
// rules, no persistence side effects, just aggregation. Kept separate
// from gameHistory.ts so the two responsibilities (storing results vs.
// summarizing them) stay independently testable.

import type { GameHistoryEntry } from './gameHistory';

export interface VsAiStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  /** 0-100, rounded to the nearest whole percent. 0 when no games played. */
  winPercentage: number;
  /** The player's highest single-game score across vs-ai games. 0 when none played. */
  bestScore: number;
}

export interface TwoPlayerStats {
  gamesPlayed: number;
  player1Wins: number;
  player2Wins: number;
  draws: number;
}

export function computeVsAiStats(history: GameHistoryEntry[]): VsAiStats {
  const games = history.filter((entry) => entry.mode === 'vs-ai');
  const wins = games.filter((entry) => entry.winner === 'player').length;
  const losses = games.filter((entry) => entry.winner === 'ai').length;
  const bestScore = games.reduce(
    (best, entry) => Math.max(best, entry.playerScore),
    0
  );

  return {
    gamesPlayed: games.length,
    wins,
    losses,
    winPercentage:
      games.length === 0 ? 0 : Math.round((wins / games.length) * 100),
    bestScore,
  };
}

export function computeTwoPlayerStats(
  history: GameHistoryEntry[]
): TwoPlayerStats {
  const games = history.filter((entry) => entry.mode === 'two-players');

  return {
    gamesPlayed: games.length,
    player1Wins: games.filter((entry) => entry.winner === 'player').length,
    player2Wins: games.filter((entry) => entry.winner === 'ai').length,
    draws: games.filter((entry) => entry.winner === 'draw').length,
  };
}
