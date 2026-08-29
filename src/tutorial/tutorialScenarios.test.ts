// Locks in the hand-worked-out arithmetic behind the tutorial scenario —
// if the engine's rules ever change, this is the test that will catch the
// tutorial silently going stale/incorrect.

import { describe, expect, it } from 'vitest';
import { makeMove } from '../game/engine';
import {
  createTutorialScenario,
  TUTORIAL_OPPONENT_PIT_ID,
  TUTORIAL_PLAYER_PIT_ID,
} from './tutorialScenarios';

describe('tutorial scenario', () => {
  it('the player tapping the tutorial pit produces a deterministic capture', () => {
    const scenario = createTutorialScenario();

    const result = makeMove(scenario, TUTORIAL_PLAYER_PIT_ID);

    expect(result.capture).not.toBeNull();
    expect(result.capture?.capturedBy).toBe('player');
    expect(result.capture?.capturedSeeds).toBe(6);
    expect(result.gameState.playerCollectedSeeds).toBe(6);
    expect(result.gameState.aiCollectedSeeds).toBe(0);
    expect(result.nextTurn).toBe('ai');
    expect(result.gameState.status).toBe('in-progress');
  });

  it('the scripted opponent reply is a valid, capture-free move that switches the turn back', () => {
    const scenario = createTutorialScenario();
    const afterPlayerMove = makeMove(scenario, TUTORIAL_PLAYER_PIT_ID).gameState;

    const result = makeMove(afterPlayerMove, TUTORIAL_OPPONENT_PIT_ID);

    expect(result.capture).toBeNull();
    expect(result.gameState.playerCollectedSeeds).toBe(6);
    expect(result.gameState.aiCollectedSeeds).toBe(0);
    expect(result.nextTurn).toBe('player');
    expect(result.gameState.status).toBe('in-progress');
  });

  it('returns a fresh, independent object every call', () => {
    const a = createTutorialScenario();
    const b = createTutorialScenario();

    expect(a).not.toBe(b);
    expect(a.pits).not.toBe(b.pits);
    expect(a).toEqual(b);
  });
});
