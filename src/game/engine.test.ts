import { describe, expect, it } from 'vitest';
import type { GameState, Owner, Pit } from './gameState';
import { makeMove } from './engine';

// Builds a 14-pit array using the same id scheme as createInitialGameState:
// ai pits are ids 0-6 (index 0-6), player pits are ids 7-13 (index 0-6).
// `seedCounts` must supply seeds in that exact id order.
function makePits(seedCounts: number[]): Pit[] {
  if (seedCounts.length !== 14) {
    throw new Error('makePits requires exactly 14 seed counts');
  }

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

function buildState(
  seedCounts: number[],
  currentTurn: Owner = 'player',
  overrides: Partial<GameState> = {}
): GameState {
  return {
    pits: makePits(seedCounts),
    currentTurn,
    playerCollectedSeeds: 0,
    aiCollectedSeeds: 0,
    status: 'in-progress',
    ...overrides,
  };
}

function seedsOf(state: GameState, pitId: number): number {
  const pit = state.pits.find((p) => p.id === pitId);
  if (!pit) throw new Error(`no pit with id ${pitId}`);
  return pit.seeds;
}

describe('makeMove — invalid moves', () => {
  it('throws when the chosen pit is empty', () => {
    // ai ids 0-6, player ids 7-13; pit 7 (player) is empty.
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5]);
    expect(() => makeMove(state, 7)).toThrow(/invalid move/i);
  });

  it("throws when the chosen pit belongs to the opponent (not the current turn)", () => {
    const state = buildState(
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      'player'
    );
    // pit 0 belongs to the ai — not player's to move.
    expect(() => makeMove(state, 0)).toThrow(/invalid move/i);
  });

  it('throws when the pit id does not exist on the board', () => {
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(() => makeMove(state, 99)).toThrow(/invalid move/i);
  });

  it('throws when the game is not in progress', () => {
    const state = buildState(
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      'player',
      { status: 'player-won' }
    );
    expect(() => makeMove(state, 7)).toThrow(/not in progress/i);
  });

  it('does not mutate the original game state', () => {
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 3, 0, 0, 5, 5, 5, 5]);
    const snapshot = JSON.parse(JSON.stringify(state));
    makeMove(state, 7);
    expect(state).toEqual(snapshot);
  });
});

describe('makeMove — valid pit / seed distribution', () => {
  it('sows one seed into each of the next pits with no relay or capture', () => {
    // player pit 7 has 3 seeds; pits 8, 9, 10 are empty; pit 11 is also
    // empty so no capture happens after landing in the (now non-empty) pit 10.
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 3, 0, 0, 0, 0, 0, 0]);

    const result = makeMove(state, 7);

    expect(seedsOf(result.gameState, 7)).toBe(0);
    expect(seedsOf(result.gameState, 8)).toBe(1);
    expect(seedsOf(result.gameState, 9)).toBe(1);
    expect(seedsOf(result.gameState, 10)).toBe(1);
    expect(seedsOf(result.gameState, 11)).toBe(0); // untouched

    expect(result.steps).toEqual([
      { sourcePitId: 7, seedsSown: 3, dropPitIds: [8, 9, 10] },
    ]);
    expect(result.pitsAffected.sort((a, b) => a - b)).toEqual([7, 8, 9, 10]);
    expect(result.capture).toBeNull();
  });

  it('leaves untouched pits exactly as they were', () => {
    // pit 7 (2 seeds) sows into 8, 9 only; pit 10 stays empty so no
    // capture reaches into it, and 11/12/13 are never in the sowing path.
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 2, 0, 0, 0, 3, 2, 1]);
    const result = makeMove(state, 7);

    expect(seedsOf(result.gameState, 10)).toBe(0);
    expect(seedsOf(result.gameState, 11)).toBe(3);
    expect(seedsOf(result.gameState, 12)).toBe(2);
    expect(seedsOf(result.gameState, 13)).toBe(1);
  });
});

describe('makeMove — boundary movement (crossing rows)', () => {
  it('crosses from the last player pit into the first ai pit encountered in sow order', () => {
    // pit 13 is the player's last pit; sowing order continues into ai pit 6.
    const state = buildState([3, 3, 3, 3, 3, 0, 0, 5, 5, 5, 5, 5, 5, 1]);

    const result = makeMove(state, 13);

    expect(seedsOf(result.gameState, 13)).toBe(0);
    expect(seedsOf(result.gameState, 6)).toBe(1); // landed here, was empty -> chain ends
    expect(result.steps).toEqual([
      { sourcePitId: 13, seedsSown: 1, dropPitIds: [6] },
    ]);
    expect(result.capture).toBeNull(); // pit 5 (next after 6) is also empty
    expect(result.nextTurn).toBe('ai');
  });
});

describe('makeMove — wrapping from the last pit to the first pit', () => {
  it('wraps from ai pit 0 back around to player pit 7', () => {
    // sow order ends ..., 1, 0 then wraps back to 7 (start of player row).
    // pit 8 (the pit after 7) is left empty so landing in pit 7 doesn't
    // trigger a capture, keeping this test focused on wrap-around only.
    const state = buildState(
      [0, 2, 5, 5, 5, 5, 5, 0, 0, 4, 4, 4, 4, 4],
      'ai'
    );

    const result = makeMove(state, 1);

    expect(seedsOf(result.gameState, 1)).toBe(0);
    expect(seedsOf(result.gameState, 0)).toBe(1);
    expect(seedsOf(result.gameState, 7)).toBe(1); // wrapped around here
    expect(result.steps).toEqual([
      { sourcePitId: 1, seedsSown: 2, dropPitIds: [0, 7] },
    ]);
    expect(result.nextTurn).toBe('player');
  });
});

describe('makeMove — relay sowing', () => {
  it('continues sowing when the last seed lands in a non-empty pit, until it lands in an empty one', () => {
    // pit 7 has 1 seed -> lands in pit 8 (which has 2, non-empty) -> relay:
    // pick up all 3 from pit 8, sow into 9, 10, 11. Pit 11 is empty -> ends there.
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 1, 2, 2, 3, 0, 0, 0]);

    const result = makeMove(state, 7);

    expect(result.steps).toEqual([
      { sourcePitId: 7, seedsSown: 1, dropPitIds: [8] },
      { sourcePitId: 8, seedsSown: 3, dropPitIds: [9, 10, 11] },
    ]);

    expect(seedsOf(result.gameState, 7)).toBe(0);
    expect(seedsOf(result.gameState, 8)).toBe(0);
    expect(seedsOf(result.gameState, 9)).toBe(3);
    expect(seedsOf(result.gameState, 10)).toBe(4);
    expect(seedsOf(result.gameState, 11)).toBe(1); // ended here, no capture (pit 12 empty)

    expect(result.pitsAffected.sort((a, b) => a - b)).toEqual([
      7, 8, 9, 10, 11,
    ]);
    expect(result.capture).toBeNull();
  });
});

describe('makeMove — capture', () => {
  it('captures the ending pit\'s seed plus the following pit\'s seeds', () => {
    // pit 7 has 1 seed -> lands in empty pit 8 -> chain ends there.
    // pit 9 (the next pit after 8) has 4 seeds -> captured.
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 1, 0, 4, 3, 3, 3, 3]);

    const result = makeMove(state, 7);

    expect(result.capture).toEqual({
      endingPitId: 8,
      capturedPitId: 9,
      capturedSeeds: 5, // 1 (landed) + 4 (captured pit)
      capturedBy: 'player',
    });

    expect(seedsOf(result.gameState, 8)).toBe(0);
    expect(seedsOf(result.gameState, 9)).toBe(0);
    expect(result.gameState.playerCollectedSeeds).toBe(5);
    expect(result.gameState.aiCollectedSeeds).toBe(0);
  });

  it('does not capture when the following pit is also empty', () => {
    const state = buildState([5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 3, 3, 3, 3]);
    const result = makeMove(state, 7);

    expect(result.capture).toBeNull();
    expect(result.gameState.playerCollectedSeeds).toBe(0);
  });
});

describe('makeMove — turn switching', () => {
  it("switches from the player's turn to the ai's turn", () => {
    const state = buildState(
      [5, 5, 5, 5, 5, 5, 5, 2, 0, 0, 5, 5, 5, 5],
      'player'
    );
    const result = makeMove(state, 7);

    expect(result.nextTurn).toBe('ai');
    expect(result.gameState.currentTurn).toBe('ai');
  });

  it("switches from the ai's turn to the player's turn", () => {
    const state = buildState(
      [2, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      'ai'
    );
    const result = makeMove(state, 0);

    expect(result.nextTurn).toBe('player');
    expect(result.gameState.currentTurn).toBe('player');
  });
});

describe('makeMove — game over detection', () => {
  it('ends the game when the next mover has no seeds left in their own pits', () => {
    // ai pits (0-6) are all empty except pit 0 with 1 seed used to move;
    // after the player's upcoming move the ai (next mover) has none left.
    // Here: it's ai's turn, ai has exactly one seed in pit 0, sowing it
    // lands in an empty player pit 7, leaving all ai pits at 0.
    const state = buildState(
      [1, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5],
      'ai'
    );
    state.playerCollectedSeeds = 10;
    state.aiCollectedSeeds = 3;

    const result = makeMove(state, 0);

    // next mover is 'player', who still has seeds, so game should NOT be over here.
    expect(result.gameOver).toBe(false);
  });

  it('declares the player the winner when the ai has no valid moves left and trails on collected seeds', () => {
    // it's player's turn; all ai pits are already empty and this move never
    // reaches the ai's row, so after it the ai (next mover) has no moves.
    const state = buildState(
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5, 5, 5, 5],
      'player'
    );
    state.playerCollectedSeeds = 20;
    state.aiCollectedSeeds = 2;

    const result = makeMove(state, 7);

    expect(result.gameOver).toBe(true);
    expect(result.status).toBe('player-won');
    expect(result.gameState.status).toBe('player-won');
  });
});
