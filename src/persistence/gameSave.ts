// Persists the single "unfinished game" — browser localStorage only, no
// backend, no accounts. See RULES.md/App.tsx for the actual game logic;
// this module only knows how to serialize/validate/restore a GameState
// snapshot, never how to compute one.

import type { GameMode } from '../gameMode';
import type { GameState, GameStatus, Owner, Pit } from '../game/gameState';
import { readJSON, removeKey, writeJSON } from './localStorageSafe';

const SAVE_KEY = 'pallanguzhi:savedGame';
const SAVE_VERSION = 1;

export interface SavedGame {
  version: typeof SAVE_VERSION;
  mode: GameMode;
  /**
   * Placeholder for a future AI difficulty setting — this app's AI
   * (src/game/ai/AIController.ts) always plays uniform-random moves
   * regardless of this value today. null in two-players mode, where
   * difficulty doesn't apply.
   */
  difficulty: string | null;
  gameState: GameState;
  moveCount: number;
  savedAt: string; // ISO timestamp
}

function isOwner(value: unknown): value is Owner {
  return value === 'player' || value === 'ai';
}

function isGameStatus(value: unknown): value is GameStatus {
  return (
    value === 'in-progress' ||
    value === 'player-won' ||
    value === 'ai-won' ||
    value === 'draw'
  );
}

function isPit(value: unknown): value is Pit {
  if (typeof value !== 'object' || value === null) return false;
  const pit = value as Record<string, unknown>;
  return (
    typeof pit.id === 'number' &&
    isOwner(pit.owner) &&
    typeof pit.index === 'number' &&
    typeof pit.seeds === 'number' &&
    pit.seeds >= 0
  );
}

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.pits) &&
    state.pits.length === 14 &&
    state.pits.every(isPit) &&
    isOwner(state.currentTurn) &&
    typeof state.playerCollectedSeeds === 'number' &&
    typeof state.aiCollectedSeeds === 'number' &&
    isGameStatus(state.status)
  );
}

function isGameMode(value: unknown): value is GameMode {
  return value === 'vs-ai' || value === 'two-players';
}

function isSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== 'object' || value === null) return false;
  const save = value as Record<string, unknown>;
  return (
    save.version === SAVE_VERSION &&
    isGameMode(save.mode) &&
    (save.difficulty === null || typeof save.difficulty === 'string') &&
    isGameState(save.gameState) &&
    typeof save.moveCount === 'number' &&
    save.moveCount >= 0 &&
    typeof save.savedAt === 'string'
  );
}

export function saveGame(save: Omit<SavedGame, 'version' | 'savedAt'>): void {
  const full: SavedGame = {
    ...save,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
  };
  writeJSON(SAVE_KEY, full);
}

/**
 * Returns the saved game, or null if there isn't one, or what's stored
 * is corrupted / from an incompatible schema version — callers should
 * treat null exactly like "no unfinished game", never as an error.
 */
export function loadSavedGame(): SavedGame | null {
  const raw = readJSON<unknown>(SAVE_KEY);
  return isSavedGame(raw) ? raw : null;
}

export function clearSavedGame(): void {
  removeKey(SAVE_KEY);
}
