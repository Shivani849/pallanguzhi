import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, getValidMoves } from '../game/gameState';
import { AIPlayerController } from './AIPlayerController';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AIPlayerController', () => {
  it('has kind "ai"', () => {
    expect(new AIPlayerController().kind).toBe('ai');
  });

  it('is not thinking until requestMove is called', () => {
    const controller = new AIPlayerController();
    expect(controller.isThinking()).toBe(false);
  });

  it('is thinking immediately after requestMove, before the delay elapses', () => {
    const controller = new AIPlayerController();
    controller.requestMove(createInitialGameState(), {
      onMoveChosen: () => {},
    });
    expect(controller.isThinking()).toBe(true);
  });

  it('does not call onMoveChosen before the thinking delay elapses', () => {
    const controller = new AIPlayerController({
      minThinkingMs: 500,
      maxThinkingMs: 500,
    });
    const onMoveChosen = vi.fn();

    controller.requestMove(createInitialGameState(), { onMoveChosen });
    vi.advanceTimersByTime(499);

    expect(onMoveChosen).not.toHaveBeenCalled();
  });

  it('calls onMoveChosen with a legal pit id once the thinking delay elapses', () => {
    const controller = new AIPlayerController({
      minThinkingMs: 500,
      maxThinkingMs: 500,
    });
    const onMoveChosen = vi.fn();
    const state = createInitialGameState();
    const validIds = new Set(getValidMoves(state).map((pit) => pit.id));

    controller.requestMove(state, { onMoveChosen });
    vi.advanceTimersByTime(500);

    expect(onMoveChosen).toHaveBeenCalledTimes(1);
    expect(validIds.has(onMoveChosen.mock.calls[0][0])).toBe(true);
  });

  it('is no longer thinking once it has chosen a move', () => {
    const controller = new AIPlayerController({
      minThinkingMs: 100,
      maxThinkingMs: 100,
    });
    controller.requestMove(createInitialGameState(), {
      onMoveChosen: () => {},
    });
    vi.advanceTimersByTime(100);
    expect(controller.isThinking()).toBe(false);
  });

  it('cancelPendingMove stops the thinking timer before it fires', () => {
    const controller = new AIPlayerController({
      minThinkingMs: 100,
      maxThinkingMs: 100,
    });
    const onMoveChosen = vi.fn();

    controller.requestMove(createInitialGameState(), { onMoveChosen });
    controller.cancelPendingMove();
    vi.advanceTimersByTime(1000);

    expect(onMoveChosen).not.toHaveBeenCalled();
    expect(controller.isThinking()).toBe(false);
  });

  it('cancelPendingMove is a safe no-op when nothing is pending', () => {
    const controller = new AIPlayerController();
    expect(() => controller.cancelPendingMove()).not.toThrow();
  });
});
