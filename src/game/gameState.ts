// Pure data model for the Pallanguzhi board.
// No rendering, no seed-distribution rules, no AI — just the shape of the
// game state, functions to construct it, and read-only queries over it.

export type Owner = 'player' | 'ai';

export type GameStatus = 'in-progress' | 'player-won' | 'ai-won' | 'draw';

export interface Pit {
  id: number;       // 0-13, stable identity for the pit
  owner: Owner;     // which side this pit belongs to
  index: number;    // position within the owner's row (0-6)
  seeds: number;    // current seed count
}

export interface GameState {
  pits: Pit[];               // always 14 pits: 7 ai + 7 player
  currentTurn: Owner;        // whose turn it is to move
  playerCollectedSeeds: number;
  aiCollectedSeeds: number;
  status: GameStatus;
}

// Traditional Pallanguzhi starting seed count per pit.
export const STARTING_SEEDS_PER_PIT = 6;

const PITS_PER_SIDE = 7;

export function createInitialGameState(
  startingSeeds: number = STARTING_SEEDS_PER_PIT
): GameState {
  const pits: Pit[] = [];

  for (let index = 0; index < PITS_PER_SIDE; index++) {
    pits.push({ id: index, owner: 'ai', index, seeds: startingSeeds });
  }

  for (let index = 0; index < PITS_PER_SIDE; index++) {
    pits.push({
      id: PITS_PER_SIDE + index,
      owner: 'player',
      index,
      seeds: startingSeeds,
    });
  }

  return {
    pits,
    currentTurn: 'player',
    playerCollectedSeeds: 0,
    aiCollectedSeeds: 0,
    status: 'in-progress',
  };
}

export function getPlayerPits(state: GameState): Pit[] {
  return state.pits
    .filter((pit) => pit.owner === 'player')
    .sort((a, b) => a.index - b.index);
}

export function getAIPits(state: GameState): Pit[] {
  return state.pits
    .filter((pit) => pit.owner === 'ai')
    .sort((a, b) => a.index - b.index);
}

// A valid move is one of the current player's own pits that still has seeds.
// Seed-distribution/capture rules are not implemented yet (Phase 3+).
export function getValidMoves(state: GameState): Pit[] {
  if (state.status !== 'in-progress') {
    return [];
  }

  const ownPits =
    state.currentTurn === 'player' ? getPlayerPits(state) : getAIPits(state);

  return ownPits.filter((pit) => pit.seeds > 0);
}
