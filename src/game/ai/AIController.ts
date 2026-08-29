// Basic single-player AI opponent.
//
// This module makes NO rules decisions of its own — it only asks the game
// engine's own getValidMoves() for the current turn-holder's legal pits
// and picks one. The actual move is still executed through the same
// makeMove() the player uses (see App.tsx), so there is exactly one
// implementation of Pallanguzhi's rules in this project.

import type { GameState } from '../gameState';
import { getValidMoves } from '../gameState';

/**
 * Picks one of the current turn-holder's legal pits at random.
 *
 * Throws if there are no valid moves — callers should only invoke this
 * while the game is in progress and it's actually this side's turn.
 */
export function chooseAIMove(state: GameState): number {
  const validMoves = getValidMoves(state);

  if (validMoves.length === 0) {
    throw new Error('chooseAIMove: no valid moves available for the current turn');
  }

  const randomIndex = Math.floor(Math.random() * validMoves.length);
  return validMoves[randomIndex].id;
}
