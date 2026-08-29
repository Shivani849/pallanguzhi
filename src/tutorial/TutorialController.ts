// Pure tutorial-flow logic — no React, no rendering, no rules of its own.
// Owns exactly what the spec asks a tutorial system to own: the current
// step, which pits are highlighted, and which player action (if any) is
// currently allowed. Every actual board move is still made by calling the
// real engine's makeMove() (see TutorialScreen.tsx) — this module never
// computes a move outcome itself.

import { TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialStep } from './tutorialSteps';
import { TUTORIAL_PLAYER_PIT_ID } from './tutorialScenarios';

export function getStep(stepIndex: number): TutorialStep {
  return TUTORIAL_STEPS[stepIndex];
}

export function totalSteps(): number {
  return TUTORIAL_STEPS.length;
}

export function isLastStep(stepIndex: number): boolean {
  return stepIndex === TUTORIAL_STEPS.length - 1;
}

/**
 * The one pit the player is allowed to tap, or null if the current step
 * doesn't accept a pit tap at all (only 'awaiting-tap' does).
 */
export function allowedPitId(stepIndex: number): number | null {
  return getStep(stepIndex).kind === 'awaiting-tap'
    ? TUTORIAL_PLAYER_PIT_ID
    : null;
}

export function isPitTapAllowed(stepIndex: number, pitId: number): boolean {
  return allowedPitId(stepIndex) === pitId;
}
