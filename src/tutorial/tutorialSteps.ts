// Static step metadata for the interactive tutorial. This is presentation
// content only — no rules, no move logic. TutorialController.ts and
// TutorialScreen.tsx decide what to *do* at each step; this just says what
// each step *is*.

import { TUTORIAL_PLAYER_PIT_ID } from './tutorialScenarios';

export type TutorialStepKind =
  | 'info' // shows a message + a Next button
  | 'awaiting-tap' // only the tutorial pit is tappable; advances on tap
  | 'awaiting-move' // a button triggers the scripted opponent move
  | 'complete'; // final step: pick where to go next

export interface TutorialStep {
  id: number;
  kind: TutorialStepKind;
  message: string;
  /** Pits to visually highlight (non-interactively) while this step shows. */
  highlightPitIds: number[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    kind: 'info',
    message: 'This is your side of the board.',
    highlightPitIds: [7, 8, 9, 10, 11, 12, 13],
  },
  {
    id: 2,
    kind: 'info',
    message: 'Each pit contains seeds.',
    highlightPitIds: [TUTORIAL_PLAYER_PIT_ID],
  },
  {
    id: 3,
    kind: 'awaiting-tap',
    message: 'Tap one of your pits to begin.',
    highlightPitIds: [TUTORIAL_PLAYER_PIT_ID],
  },
  {
    id: 4,
    kind: 'info',
    message: 'The seeds move according to the game rules.',
    highlightPitIds: [],
  },
  {
    id: 5,
    kind: 'info',
    message:
      'Your last seed landed in an empty pit, so you captured it plus everything in the very next pit — straight into your score!',
    highlightPitIds: [],
  },
  {
    id: 6,
    kind: 'awaiting-move',
    message: "Now it's your opponent's turn.",
    highlightPitIds: [],
  },
  {
    id: 7,
    kind: 'info',
    message:
      'The game ends when a player has no seeds left to sow on their turn. Whoever has collected the most seeds overall wins.',
    highlightPitIds: [],
  },
  {
    id: 8,
    kind: 'complete',
    message: "You're ready to play!",
    highlightPitIds: [],
  },
];
