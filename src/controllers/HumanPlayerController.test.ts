import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/gameState';
import { HumanPlayerController } from './HumanPlayerController';

describe('HumanPlayerController', () => {
  it('has kind "human"', () => {
    expect(new HumanPlayerController().kind).toBe('human');
  });

  it('is not awaiting input until requestMove is called', () => {
    const controller = new HumanPlayerController();
    expect(controller.isAwaitingInput()).toBe(false);
  });

  it('becomes awaiting input after requestMove', () => {
    const controller = new HumanPlayerController();
    controller.requestMove(createInitialGameState(), {
      onMoveChosen: () => {},
    });
    expect(controller.isAwaitingInput()).toBe(true);
  });

  it('calls onMoveChosen with the submitted pit when it is legal, and returns true', () => {
    const controller = new HumanPlayerController();
    const onMoveChosen = vi.fn();
    const state = createInitialGameState(); // currentTurn: 'player', pits 7-13

    controller.requestMove(state, { onMoveChosen });
    const accepted = controller.submitMove(7);

    expect(accepted).toBe(true);
    expect(onMoveChosen).toHaveBeenCalledWith(7);
  });

  it('rejects an illegal pit (wrong side) without calling onMoveChosen', () => {
    const controller = new HumanPlayerController();
    const onMoveChosen = vi.fn();
    const state = createInitialGameState(); // currentTurn: 'player'

    controller.requestMove(state, { onMoveChosen });
    const accepted = controller.submitMove(0); // an ai pit

    expect(accepted).toBe(false);
    expect(onMoveChosen).not.toHaveBeenCalled();
  });

  it('rejects a submitMove when no move has been requested', () => {
    const controller = new HumanPlayerController();
    expect(controller.submitMove(7)).toBe(false);
  });

  it('only accepts one move per request — a second submitMove afterwards is rejected', () => {
    const controller = new HumanPlayerController();
    const onMoveChosen = vi.fn();
    const state = createInitialGameState();

    controller.requestMove(state, { onMoveChosen });
    controller.submitMove(7);
    const secondAccepted = controller.submitMove(8);

    expect(secondAccepted).toBe(false);
    expect(onMoveChosen).toHaveBeenCalledTimes(1);
  });

  it('cancelPendingMove clears the pending request without calling onMoveChosen', () => {
    const controller = new HumanPlayerController();
    const onMoveChosen = vi.fn();
    const state = createInitialGameState();

    controller.requestMove(state, { onMoveChosen });
    controller.cancelPendingMove();

    expect(controller.isAwaitingInput()).toBe(false);
    expect(controller.submitMove(7)).toBe(false);
    expect(onMoveChosen).not.toHaveBeenCalled();
  });

  it('cancelPendingMove is a safe no-op when nothing is pending', () => {
    const controller = new HumanPlayerController();
    expect(() => controller.cancelPendingMove()).not.toThrow();
  });
});
