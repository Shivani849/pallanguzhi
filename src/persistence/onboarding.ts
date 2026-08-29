// Tracks first-time-user state — browser localStorage only, no backend, no
// accounts. Two independent flags:
//   - "has the welcome prompt been shown" (so it only ever appears once,
//     regardless of which button the user picked)
//   - "has the tutorial been completed" (so a returning, experienced user
//     is never nagged into it again)
// Both default to false (never seen / never completed) when nothing is
// stored yet, or storage is unavailable/corrupted.

import { readJSON, writeJSON } from './localStorageSafe';

const WELCOME_SEEN_KEY = 'pallanguzhi:welcomeSeen';
const TUTORIAL_COMPLETED_KEY = 'pallanguzhi:tutorialCompleted';

export function hasSeenWelcomePrompt(): boolean {
  return readJSON<boolean>(WELCOME_SEEN_KEY) === true;
}

export function markWelcomePromptSeen(): void {
  writeJSON(WELCOME_SEEN_KEY, true);
}

export function isTutorialCompleted(): boolean {
  return readJSON<boolean>(TUTORIAL_COMPLETED_KEY) === true;
}

export function markTutorialCompleted(): void {
  writeJSON(TUTORIAL_COMPLETED_KEY, true);
}
