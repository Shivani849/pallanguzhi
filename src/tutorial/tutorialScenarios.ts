// A single, deterministic board scenario for the interactive tutorial —
// hand-picked seed counts so that tapping the tutorial pit always produces
// the exact same capture, and the scripted opponent reply always produces
// the exact same (capture-free) turn switch. See tutorialScenarios.test.ts
// for the worked-out arithmetic this depends on.
//
// This is pure data plus a scenario-shaped GameState — no rules logic of
// its own. Every move made from it still goes through the real engine's
// makeMove() (see TutorialController.ts / TutorialScreen.tsx).

import type { GameState } from '../game/gameState';

// The only pit the player is allowed to tap in step 3 of the tutorial.
export const TUTORIAL_PLAYER_PIT_ID = 7;

// The pit the scripted "opponent" move sows from in step 6.
export const TUTORIAL_OPPONENT_PIT_ID = 0;

/**
 * Returns a fresh copy of the tutorial's starting board every time — never
 * a shared/mutable singleton.
 */
export function createTutorialScenario(): GameState {
  return {
    pits: [
      { id: 0, owner: 'ai', index: 0, seeds: 3 },
      { id: 1, owner: 'ai', index: 1, seeds: 4 },
      { id: 2, owner: 'ai', index: 2, seeds: 4 },
      { id: 3, owner: 'ai', index: 3, seeds: 4 },
      { id: 4, owner: 'ai', index: 4, seeds: 4 },
      { id: 5, owner: 'ai', index: 5, seeds: 4 },
      { id: 6, owner: 'ai', index: 6, seeds: 4 },
      { id: 7, owner: 'player', index: 0, seeds: 2 },
      { id: 8, owner: 'player', index: 1, seeds: 0 },
      { id: 9, owner: 'player', index: 2, seeds: 0 },
      { id: 10, owner: 'player', index: 3, seeds: 5 },
      { id: 11, owner: 'player', index: 4, seeds: 3 },
      { id: 12, owner: 'player', index: 5, seeds: 3 },
      { id: 13, owner: 'player', index: 6, seeds: 3 },
    ],
    currentTurn: 'player',
    playerCollectedSeeds: 0,
    aiCollectedSeeds: 0,
    status: 'in-progress',
  };
}
