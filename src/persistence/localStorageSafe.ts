// Small helpers for safely reading/writing JSON to localStorage — shared
// by game-save and game-history persistence. Never throws: any failure
// (localStorage unavailable, quota exceeded, corrupted JSON) is treated
// as "nothing there" rather than crashing the app. Everything here is
// purely local — no network, no accounts.

export function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full/unavailable/disabled — the game just won't persist
    // this time. Nothing to recover from here; gameplay continues.
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
