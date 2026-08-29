// Persists completed-game results — browser localStorage only, no
// backend, no accounts.

import type { GameMode } from '../gameMode';
import { readJSON, writeJSON } from './localStorageSafe';

const HISTORY_KEY = 'pallanguzhi:history';
// A generous cap so localStorage doesn't grow unbounded over a very long
// play history — oldest entries are dropped first.
const MAX_HISTORY_ENTRIES = 200;

export type HistoryWinner = 'player' | 'ai' | 'draw';

export interface GameHistoryEntry {
  date: string; // ISO timestamp of when the game ended
  mode: GameMode;
  winner: HistoryWinner;
  playerScore: number;
  aiScore: number;
  moveCount: number;
}

function isGameMode(value: unknown): value is GameMode {
  return value === 'vs-ai' || value === 'two-players';
}

function isWinner(value: unknown): value is HistoryWinner {
  return value === 'player' || value === 'ai' || value === 'draw';
}

function isHistoryEntry(value: unknown): value is GameHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.date === 'string' &&
    isGameMode(entry.mode) &&
    isWinner(entry.winner) &&
    typeof entry.playerScore === 'number' &&
    typeof entry.aiScore === 'number' &&
    typeof entry.moveCount === 'number'
  );
}

/**
 * Returns only the well-formed entries — an individual corrupted entry
 * is dropped rather than discarding the whole history.
 */
export function loadHistory(): GameHistoryEntry[] {
  const raw = readJSON<unknown>(HISTORY_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isHistoryEntry);
}

export function appendHistoryEntry(entry: GameHistoryEntry): GameHistoryEntry[] {
  const updated = [...loadHistory(), entry].slice(-MAX_HISTORY_ENTRIES);
  writeJSON(HISTORY_KEY, updated);
  return updated;
}
