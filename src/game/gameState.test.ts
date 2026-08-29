import { describe, expect, it } from 'vitest';
import {
  createInitialGameState,
  getAIPits,
  getPlayerPits,
  getValidMoves,
  STARTING_SEEDS_PER_PIT,
} from './gameState';

describe('createInitialGameState', () => {
  it('creates 14 pits total', () => {
    const state = createInitialGameState();
    expect(state.pits).toHaveLength(14);
  });

  it('creates 7 player pits and 7 ai pits', () => {
    const state = createInitialGameState();
    expect(getPlayerPits(state)).toHaveLength(7);
    expect(getAIPits(state)).toHaveLength(7);
  });

  it('initializes every pit with the default starting seed count', () => {
    const state = createInitialGameState();
    for (const pit of state.pits) {
      expect(pit.seeds).toBe(STARTING_SEEDS_PER_PIT);
    }
  });

  it('initializes every pit with a custom starting seed count', () => {
    const state = createInitialGameState(4);
    for (const pit of state.pits) {
      expect(pit.seeds).toBe(4);
    }
  });

  it('sets the player to move first, zero collected seeds, and in-progress status', () => {
    const state = createInitialGameState();
    expect(state.currentTurn).toBe('player');
    expect(state.playerCollectedSeeds).toBe(0);
    expect(state.aiCollectedSeeds).toBe(0);
    expect(state.status).toBe('in-progress');
  });

  it('assigns unique, stable ids to all 14 pits', () => {
    const state = createInitialGameState();
    const ids = state.pits.map((pit) => pit.id);
    expect(new Set(ids).size).toBe(14);
  });
});

describe('getPlayerPits / getAIPits', () => {
  it('returns only pits owned by the player, sorted by index', () => {
    const state = createInitialGameState();
    const playerPits = getPlayerPits(state);
    expect(playerPits.every((pit) => pit.owner === 'player')).toBe(true);
    expect(playerPits.map((pit) => pit.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('returns only pits owned by the ai, sorted by index', () => {
    const state = createInitialGameState();
    const aiPits = getAIPits(state);
    expect(aiPits.every((pit) => pit.owner === 'ai')).toBe(true);
    expect(aiPits.map((pit) => pit.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('getValidMoves', () => {
  it("returns all of the player's pits at the start of the game", () => {
    const state = createInitialGameState();
    const validMoves = getValidMoves(state);
    expect(validMoves).toHaveLength(7);
    expect(validMoves.every((pit) => pit.owner === 'player')).toBe(true);
  });

  it("returns the ai's pits when it is the ai's turn", () => {
    const state = createInitialGameState();
    state.currentTurn = 'ai';
    const validMoves = getValidMoves(state);
    expect(validMoves.every((pit) => pit.owner === 'ai')).toBe(true);
  });

  it('excludes empty pits from the current player\'s valid moves', () => {
    const state = createInitialGameState();
    const emptiedPit = getPlayerPits(state)[0];
    emptiedPit.seeds = 0;

    const validMoves = getValidMoves(state);

    expect(validMoves).toHaveLength(6);
    expect(validMoves.find((pit) => pit.id === emptiedPit.id)).toBeUndefined();
  });

  it('returns no moves when the game is not in progress', () => {
    const state = createInitialGameState();
    state.status = 'player-won';
    expect(getValidMoves(state)).toEqual([]);
  });
});
