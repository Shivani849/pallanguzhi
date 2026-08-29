// Native Vibration API only — no external services. Silently does
// nothing on devices/browsers that don't support it (most notably iOS
// Safari), and respects the same on/off preference as sound
// (src/audio/soundManager.ts) rather than having its own separate toggle.
//
// Only ever call this synchronously, directly inside a real user-gesture
// event handler (a click handler, not a setTimeout scheduled from one).
// Browsers (Chrome in particular) require navigator.vibrate() to be
// invoked synchronously within the gesture's own call stack — checking
// navigator.userActivation.isActive is NOT sufficient to predict this;
// it can still read true well after a deferred call would be silently
// blocked (and logged as a console error). That's exactly why this
// module deliberately exposes only a "selection" haptic: it's the only
// moment in this app's flow that's ever a direct, synchronous reaction
// to a tap.

import { isFeedbackEnabled } from './soundManager';

function supportsVibration(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

function vibrate(durationMs: number): void {
  if (!isFeedbackEnabled()) return;
  if (!supportsVibration()) return;
  navigator.vibrate(durationMs);
}

/** A pit was chosen — called synchronously from the click handler. */
export function hapticSelect(): void {
  vibrate(10);
}
