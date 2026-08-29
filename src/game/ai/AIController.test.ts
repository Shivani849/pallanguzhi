import { describe, expect, it } from 'vitest';
import type { GameState, Pit } from '../gameState';
import { createInitialGameState, getValidMoves } from '../gameState';
import { makeMove } from '../engine';
import { chooseAIMove } from './AIController';

function makePits(seedCounts: number[]): Pit[] {
  const pits: Pit[] = [];
  for (let index = 0; index < 7; index++) {
    pits.push({ id: index, owner: 'ai', index, seeds: seedCounts[index] });
  }
  for (let index = 0; index < 7; index++) {
    pits.push({
      id: 7 + index,
      owner: 'player',
      index,
      seeds: seedCounts[7 + index],
    });
  }
  return pits;
}

describe('chooseAIMove', () => {
  it('always returns one of the pits reported by getValidMoves', () => {
    const state = createInitialGameState();
    state.currentTurn = 'ai';

    const validIds = new Set(getValidMoves(state).map((pit) => pit.id));

    for (let i = 0; i < 50; i++) {
      const chosen = chooseAIMove(state);
      expect(validIds.has(chosen)).toBe(true);
    }
  });

  it("chooses from the player's pits when it's the player's turn", () => {
    const state = createInitialGameState();
    // currentTurn defaults to 'player'
    const chosen = chooseAIMove(state);
    expect(chosen).toBeGreaterThanOrEqual(7);
    expect(chosen).toBeLessThanOrEqual(13);
  });

  it('never returns a pit that is empty', () => {
    const pits = makePits([5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 3]);
    const state: GameState = {
      pits,
      currentTurn: 'player',
      playerCollectedSeeds: 0,
      aiCollectedSeeds: 0,
      status: 'in-progress',
    };

    // Only pit 13 has seeds — the only legal choice.
    for (let i = 0; i < 20; i++) {
      expect(chooseAIMove(state)).toBe(13);
    }
  });

  it('throws when there are no valid moves', () => {
    const pits = makePits([0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5]);
    const state: GameState = {
      pits,
      currentTurn: 'ai',
      playerCollectedSeeds: 0,
      aiCollectedSeeds: 0,
      status: 'in-progress',
    };

    expect(() => chooseAIMove(state)).toThrow(/no valid moves/i);
  });
});

describe('full game simulation (player + ai both via chooseAIMove)', () => {
  it('always reaches a valid end state within a bounded number of moves', () => {
    // chooseAIMove is side-agnostic — it just plays whoever's turn it is
    // legally, so it doubles as a "random player" for this simulation.
    const MAX_MOVES = 500;
    let state = createInitialGameState();
    let moves = 0;

    while (state.status === 'in-progress' && moves < MAX_MOVES) {
      const pitId = chooseAIMove(state);
      const result = makeMove(state, pitId);
      state = result.gameState;
      moves++;
    }

    expect(moves).toBeLessThan(MAX_MOVES);
    expect(['player-won', 'ai-won', 'draw']).toContain(state.status);

    // Total seeds conserved between the board and both collected totals.
    const boardSeeds = state.pits.reduce((sum, pit) => sum + pit.seeds, 0);
    expect(
      boardSeeds + state.playerCollectedSeeds + state.aiCollectedSeeds
    ).toBe(84);
  });

  it('runs several full games, all of which terminate validly', () => {
    for (let game = 0; game < 10; game++) {
      let state = createInitialGameState();
      let moves = 0;

      while (state.status === 'in-progress' && moves < 500) {
        const pitId = chooseAIMove(state);
        const result = makeMove(state, pitId);
        state = result.gameState;
        moves++;
      }

      expect(state.status).not.toBe('in-progress');
    }
  });
});
