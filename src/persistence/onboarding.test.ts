import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasSeenWelcomePrompt,
  isTutorialCompleted,
  markTutorialCompleted,
  markWelcomePromptSeen,
} from './onboarding';

beforeEach(() => {
  window.localStorage.clear();
});

describe('onboarding', () => {
  it('defaults both flags to false when nothing is stored', () => {
    expect(hasSeenWelcomePrompt()).toBe(false);
    expect(isTutorialCompleted()).toBe(false);
  });

  it('marks the welcome prompt seen independently of tutorial completion', () => {
    markWelcomePromptSeen();
    expect(hasSeenWelcomePrompt()).toBe(true);
    expect(isTutorialCompleted()).toBe(false);
  });

  it('marks the tutorial completed independently of the welcome prompt', () => {
    markTutorialCompleted();
    expect(isTutorialCompleted()).toBe(true);
    expect(hasSeenWelcomePrompt()).toBe(false);
  });

  it('treats corrupted stored values as false rather than throwing', () => {
    window.localStorage.setItem('pallanguzhi:welcomeSeen', 'not-json{{{');
    window.localStorage.setItem('pallanguzhi:tutorialCompleted', '"weird"');

    expect(() => hasSeenWelcomePrompt()).not.toThrow();
    expect(() => isTutorialCompleted()).not.toThrow();
    expect(hasSeenWelcomePrompt()).toBe(false);
    expect(isTutorialCompleted()).toBe(false);
  });
});
