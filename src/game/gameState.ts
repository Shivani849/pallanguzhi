// Pure data model for the Pallanguzhi board.
// No rendering, no rules, no AI — just the shape of the game state
// and a way to construct its initial value.

export type Owner = 'player' | 'ai';

export interface Pit {
  id: number;       // 0-13, stable identity for the pit
  owner: Owner;     // which side this pit belongs to
  index: number;    // position within the owner's row (0-6)
  seeds: number;    // current seed count
}

export interface GameState {
  pits: Pit[];       // always 14 pits: 7 player + 7 ai
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

  return { pits };
}
