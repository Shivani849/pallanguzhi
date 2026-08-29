import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setFeedbackEnabled } from './soundManager';
import { hapticCapture, hapticLose, hapticSelect, hapticWin } from './haptics';

let vibrateMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setFeedbackEnabled(true);
  vibrateMock = vi.fn();
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateMock,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  setFeedbackEnabled(true);
  // Remove our stub so it doesn't leak into unrelated tests/files.
  Object.defineProperty(navigator, 'vibrate', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

describe('haptics', () => {
  it('vibrates with a short pattern on pit selection', () => {
    hapticSelect();
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('vibrates with a distinct pattern on capture', () => {
    hapticCapture();
    expect(vibrateMock).toHaveBeenCalledWith([15, 30, 15]);
  });

  it('vibrates with a distinct pattern on win', () => {
    hapticWin();
    expect(vibrateMock).toHaveBeenCalledWith([20, 40, 20, 40, 20]);
  });

  it('vibrates with a distinct pattern on loss', () => {
    hapticLose();
    expect(vibrateMock).toHaveBeenCalledWith(40);
  });

  it('does nothing when feedback is disabled', () => {
    setFeedbackEnabled(false);
    hapticSelect();
    hapticCapture();
    hapticWin();
    hapticLose();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('does not throw when the Vibration API is unsupported', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(() => hapticSelect()).not.toThrow();
  });
});
