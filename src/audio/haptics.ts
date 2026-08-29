// Native Vibration API only — no external services. Silently does
// nothing on devices/browsers that don't support it (most notably iOS
// Safari), and respects the same on/off preference as sound
// (src/audio/soundManager.ts) rather than having its own separate toggle.

import { isFeedbackEnabled } from './soundManager';

function supportsVibration(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

function vibrate(pattern: number | number[]): void {
  if (!isFeedbackEnabled()) return;
  if (!supportsVibration()) return;
  navigator.vibrate(pattern);
}

/** A pit was chosen. */
export function hapticSelect(): void {
  vibrate(10);
}

/** A move ended with a capture. */
export function hapticCapture(): void {
  vibrate([15, 30, 15]);
}

/** The player won the game. */
export function hapticWin(): void {
  vibrate([20, 40, 20, 40, 20]);
}

/** The ai won the game. */
export function hapticLose(): void {
  vibrate(40);
}
