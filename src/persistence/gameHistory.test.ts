import { afterEach, describe, expect, it } from 'vitest';
import { appendHistoryEntry, loadHistory } from './gameHistory';
import type { GameHistoryEntry } from './gameHistory';

afterEach(() => {
  window.localStorage.clear();
});

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    date: '2026-01-01T00:00:00.000Z',
    mode: 'vs-ai',
    winner: 'player',
    playerScore: 50,
    aiScore: 34,
    moveCount: 12,
    ...overrides,
  };
}

describe('loadHistory / appendHistoryEntry', () => {
  it('returns an empty array when nothing has been recorded', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('appends and persists an entry', () => {
    const entry = makeEntry();
    appendHistoryEntry(entry);

    expect(loadHistory()).toEqual([entry]);
  });

  it('accumulates multiple entries in order', () => {
    const first = makeEntry({ winner: 'player' });
    const second = makeEntry({ winner: 'ai', mode: 'two-players' });

    appendHistoryEntry(first);
    appendHistoryEntry(second);

    expect(loadHistory()).toEqual([first, second]);
  });

  it('returns the updated list from appendHistoryEntry itself', () => {
    const entry = makeEntry();
    const result = appendHistoryEntry(entry);
    expect(result).toEqual([entry]);
  });

  it('caps history length, dropping the oldest entries first', () => {
    for (let i = 0; i < 205; i++) {
      appendHistoryEntry(makeEntry({ moveCount: i }));
    }
    const history = loadHistory();
    expect(history.length).toBe(200);
    // The oldest 5 (moveCount 0-4) should have been dropped.
    expect(history[0].moveCount).toBe(5);
    expect(history[history.length - 1].moveCount).toBe(204);
  });
});

describe('loadHistory — corrupted/invalid data safety', () => {
  it('returns an empty array for garbage JSON', () => {
    window.localStorage.setItem('pallanguzhi:history', 'not json{{');
    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    window.localStorage.setItem(
      'pallanguzhi:history',
      JSON.stringify({ not: 'an array' })
    );
    expect(loadHistory()).toEqual([]);
  });

  it('drops only the malformed entries, keeping the well-formed ones', () => {
    const good = makeEntry();
    window.localStorage.setItem(
      'pallanguzhi:history',
      JSON.stringify([good, { bogus: true }, { ...good, winner: 'nope' }])
    );

    expect(loadHistory()).toEqual([good]);
  });
});
