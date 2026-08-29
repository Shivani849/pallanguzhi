import { describe, expect, it } from 'vitest';
import {
  allowedPitId,
  getStep,
  isLastStep,
  isPitTapAllowed,
  totalSteps,
} from './TutorialController';
import { TUTORIAL_PLAYER_PIT_ID } from './tutorialScenarios';

describe('TutorialController', () => {
  it('exposes 8 steps, ending with the "complete" step', () => {
    expect(totalSteps()).toBe(8);
    expect(getStep(7).kind).toBe('complete');
    expect(isLastStep(7)).toBe(true);
    expect(isLastStep(6)).toBe(false);
  });

  it('only allows a pit tap on the awaiting-tap step, and only the tutorial pit', () => {
    const awaitingTapIndex = TUTORIAL_STEPS_FIND_INDEX('awaiting-tap');

    expect(allowedPitId(awaitingTapIndex)).toBe(TUTORIAL_PLAYER_PIT_ID);
    expect(isPitTapAllowed(awaitingTapIndex, TUTORIAL_PLAYER_PIT_ID)).toBe(
      true
    );
    expect(isPitTapAllowed(awaitingTapIndex, TUTORIAL_PLAYER_PIT_ID + 1)).toBe(
      false
    );
  });

  it('allows no pit tap on info/awaiting-move/complete steps', () => {
    for (let i = 0; i < totalSteps(); i++) {
      if (getStep(i).kind === 'awaiting-tap') continue;
      expect(allowedPitId(i)).toBeNull();
      expect(isPitTapAllowed(i, TUTORIAL_PLAYER_PIT_ID)).toBe(false);
    }
  });

  function TUTORIAL_STEPS_FIND_INDEX(kind: string): number {
    for (let i = 0; i < totalSteps(); i++) {
      if (getStep(i).kind === kind) return i;
    }
    throw new Error(`no step of kind ${kind}`);
  }
});
