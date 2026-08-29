import { afterEach, describe, expect, it } from 'vitest';
import { readJSON, removeKey, writeJSON } from './localStorageSafe';

const KEY = 'test:key';

afterEach(() => {
  window.localStorage.clear();
});

describe('readJSON / writeJSON / removeKey', () => {
  it('returns null when nothing is stored', () => {
    expect(readJSON(KEY)).toBeNull();
  });

  it('round-trips a value written with writeJSON', () => {
    writeJSON(KEY, { a: 1, b: [2, 3] });
    expect(readJSON(KEY)).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns null (not a throw) for corrupted JSON', () => {
    window.localStorage.setItem(KEY, '{not valid json');
    expect(() => readJSON(KEY)).not.toThrow();
    expect(readJSON(KEY)).toBeNull();
  });

  it('removeKey clears a stored value', () => {
    writeJSON(KEY, { a: 1 });
    removeKey(KEY);
    expect(readJSON(KEY)).toBeNull();
  });

  it('removeKey is a safe no-op when nothing is stored', () => {
    expect(() => removeKey(KEY)).not.toThrow();
  });

  it('writeJSON does not throw when localStorage.setItem throws (e.g. quota exceeded)', () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      expect(() => writeJSON(KEY, { a: 1 })).not.toThrow();
    } finally {
      window.localStorage.setItem = original;
    }
  });
});
