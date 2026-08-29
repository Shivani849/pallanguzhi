import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isFeedbackEnabled,
  playCaptureSound,
  playDrawSound,
  playLoseSound,
  playSeedTick,
  playSelectSound,
  playTurnChangeSound,
  playWinSound,
  setFeedbackEnabled,
  shouldPlaySeedTick,
  toggleFeedbackEnabled,
} from './soundManager';

beforeEach(() => {
  window.localStorage.clear();
  setFeedbackEnabled(true);
});

afterEach(() => {
  window.localStorage.clear();
  setFeedbackEnabled(true);
});

describe('feedback enabled/disabled preference', () => {
  it('defaults to enabled on first load when nothing is stored', async () => {
    // The module reads localStorage once, at load time, into a cached
    // variable — so testing the actual default requires a fresh module
    // instance over a clean localStorage, not just calling the getter.
    window.localStorage.clear();
    vi.resetModules();
    const fresh = await import('./soundManager');
    expect(fresh.isFeedbackEnabled()).toBe(true);
  });

  it('defaults to disabled on load when a disabled preference was stored', async () => {
    window.localStorage.setItem('pallanguzhi:feedbackEnabled', 'false');
    vi.resetModules();
    const fresh = await import('./soundManager');
    expect(fresh.isFeedbackEnabled()).toBe(false);
  });

  it('persists a disabled preference to localStorage', () => {
    setFeedbackEnabled(false);
    expect(isFeedbackEnabled()).toBe(false);
    expect(window.localStorage.getItem('pallanguzhi:feedbackEnabled')).toBe(
      'false'
    );
  });

  it('toggleFeedbackEnabled flips the value and returns the new state', () => {
    setFeedbackEnabled(true);
    expect(toggleFeedbackEnabled()).toBe(false);
    expect(isFeedbackEnabled()).toBe(false);
    expect(toggleFeedbackEnabled()).toBe(true);
    expect(isFeedbackEnabled()).toBe(true);
  });
});

describe('shouldPlaySeedTick (pure throttle logic)', () => {
  it('allows the first tick (lastTickAt = 0, well before minInterval)', () => {
    expect(shouldPlaySeedTick(1000, 0, 90)).toBe(true);
  });

  it('blocks a tick that arrives before the minimum interval has passed', () => {
    expect(shouldPlaySeedTick(1050, 1000, 90)).toBe(false);
  });

  it('allows a tick exactly at the minimum interval boundary', () => {
    expect(shouldPlaySeedTick(1090, 1000, 90)).toBe(true);
  });

  it('allows a tick well after the minimum interval', () => {
    expect(shouldPlaySeedTick(2000, 1000, 90)).toBe(true);
  });
});

describe('playX functions never throw, even with no Web Audio API available', () => {
  // jsdom (this test environment) has no AudioContext, which is exactly
  // the "unsupported browser" fallback path these functions are meant to
  // degrade gracefully through — so simply calling them without an
  // exception is the meaningful assertion here.
  it('does not throw for any sound, enabled or disabled', () => {
    for (const enabled of [true, false]) {
      setFeedbackEnabled(enabled);
      expect(() => playSelectSound()).not.toThrow();
      expect(() => playSeedTick(Date.now() + Math.random() * 10000)).not.toThrow();
      expect(() => playCaptureSound()).not.toThrow();
      expect(() => playTurnChangeSound()).not.toThrow();
      expect(() => playWinSound()).not.toThrow();
      expect(() => playLoseSound()).not.toThrow();
      expect(() => playDrawSound()).not.toThrow();
    }
  });
});
