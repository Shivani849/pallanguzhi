import { afterEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/gameState';
import { clearSavedGame, loadSavedGame, saveGame } from './gameSave';

afterEach(() => {
  window.localStorage.clear();
});

describe('saveGame / loadSavedGame', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadSavedGame()).toBeNull();
  });

  it('round-trips a saved game', () => {
    const gameState = createInitialGameState();
    saveGame({ mode: 'vs-ai', difficulty: 'normal', gameState, moveCount: 3 });

    const loaded = loadSavedGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.mode).toBe('vs-ai');
    expect(loaded?.difficulty).toBe('normal');
    expect(loaded?.moveCount).toBe(3);
    expect(loaded?.gameState).toEqual(gameState);
    expect(typeof loaded?.savedAt).toBe('string');
  });

  it('stores a null difficulty for two-players mode', () => {
    saveGame({
      mode: 'two-players',
      difficulty: null,
      gameState: createInitialGameState(),
      moveCount: 0,
    });

    expect(loadSavedGame()?.difficulty).toBeNull();
  });

  it('clearSavedGame removes the save', () => {
    saveGame({
      mode: 'vs-ai',
      difficulty: 'normal',
      gameState: createInitialGameState(),
      moveCount: 1,
    });
    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });
});

describe('loadSavedGame — corrupted/invalid data safety', () => {
  it('returns null for garbage JSON', () => {
    window.localStorage.setItem('pallanguzhi:savedGame', 'not json at all{{');
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null for a valid JSON value of the wrong shape', () => {
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({ hello: 'world' })
    );
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null for a save with an incompatible version number', () => {
    const gameState = createInitialGameState();
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({
        version: 999,
        mode: 'vs-ai',
        difficulty: null,
        gameState,
        moveCount: 0,
        savedAt: new Date().toISOString(),
      })
    );
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null when the board does not have exactly 14 pits', () => {
    const gameState = createInitialGameState();
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({
        version: 1,
        mode: 'vs-ai',
        difficulty: null,
        gameState: { ...gameState, pits: gameState.pits.slice(0, 10) },
        moveCount: 0,
        savedAt: new Date().toISOString(),
      })
    );
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null when a pit has a negative seed count', () => {
    const gameState = createInitialGameState();
    const corruptedPits = gameState.pits.map((pit, i) =>
      i === 0 ? { ...pit, seeds: -1 } : pit
    );
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({
        version: 1,
        mode: 'vs-ai',
        difficulty: null,
        gameState: { ...gameState, pits: corruptedPits },
        moveCount: 0,
        savedAt: new Date().toISOString(),
      })
    );
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null when mode is not a recognized value', () => {
    const gameState = createInitialGameState();
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({
        version: 1,
        mode: 'not-a-real-mode',
        difficulty: null,
        gameState,
        moveCount: 0,
        savedAt: new Date().toISOString(),
      })
    );
    expect(loadSavedGame()).toBeNull();
  });
});
