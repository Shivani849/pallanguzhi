// Pure display-label helpers for adapting text to the current game mode.
//
// This is NOT game-rules logic — the engine (src/game/*) has no concept
// of "modes" at all, and never will: it only ever sees two sides,
// 'player' and 'ai', and applies the exact same rules to both regardless
// of who's controlling them. This module just decides what to *call*
// those two sides, and how to phrase turn/result text, depending on
// whether a second human or the AI is sitting in the 'ai' seat.

import type { GameState, GameStatus, Owner } from './game/gameState';

export type GameMode = 'vs-ai' | 'two-players';

/** What to call a given side under the current mode. */
export function sideLabel(mode: GameMode, owner: Owner): string {
  if (mode === 'vs-ai') {
    return owner === 'player' ? 'You' : 'AI';
  }
  return owner === 'player' ? 'Player 1' : 'Player 2';
}

export function opponentOf(owner: Owner): Owner {
  return owner === 'player' ? 'ai' : 'player';
}

/** The pill text shown while the game is in progress or just ended. */
export function turnStatusLabel(mode: GameMode, state: GameState): string {
  if (state.status !== 'in-progress') {
    return resultLabel(mode, state.status);
  }
  return mode === 'vs-ai'
    ? state.currentTurn === 'player'
      ? 'Your turn'
      : "AI's turn"
    : `${sideLabel(mode, state.currentTurn)}'s turn`;
}

function resultLabel(mode: GameMode, status: GameStatus): string {
  switch (status) {
    case 'player-won':
      return mode === 'vs-ai' ? 'You win!' : 'Player 1 wins!';
    case 'ai-won':
      return mode === 'vs-ai' ? 'AI wins!' : 'Player 2 wins!';
    case 'draw':
      return "It's a draw!";
    case 'in-progress':
    default:
      return '';
  }
}

/** The game-over card's headline, or null while the game is still on. */
export function overlayTitle(mode: GameMode, status: GameStatus): string | null {
  switch (status) {
    case 'player-won':
      return mode === 'vs-ai' ? 'You Win!' : 'Player 1 Wins!';
    case 'ai-won':
      return mode === 'vs-ai' ? 'You Lose' : 'Player 2 Wins!';
    case 'draw':
      return 'Draw';
    case 'in-progress':
    default:
      return null;
  }
}
