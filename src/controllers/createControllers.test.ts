import { describe, expect, it } from 'vitest';
import { createControllers, isHumanController } from './createControllers';
import { HumanPlayerController } from './HumanPlayerController';
import { AIPlayerController } from './AIPlayerController';

describe('createControllers', () => {
  it('vs-ai: player is human, ai is an AIPlayerController', () => {
    const controllers = createControllers('vs-ai');
    expect(controllers.player).toBeInstanceOf(HumanPlayerController);
    expect(controllers.ai).toBeInstanceOf(AIPlayerController);
  });

  it('two-players: both seats are human controllers', () => {
    const controllers = createControllers('two-players');
    expect(controllers.player).toBeInstanceOf(HumanPlayerController);
    expect(controllers.ai).toBeInstanceOf(HumanPlayerController);
  });

  it('two-players: the two seats are distinct controller instances', () => {
    const controllers = createControllers('two-players');
    expect(controllers.player).not.toBe(controllers.ai);
  });
});

describe('isHumanController', () => {
  it('is true for a HumanPlayerController', () => {
    expect(isHumanController(new HumanPlayerController())).toBe(true);
  });

  it('is false for an AIPlayerController', () => {
    expect(isHumanController(new AIPlayerController())).toBe(false);
  });
});
