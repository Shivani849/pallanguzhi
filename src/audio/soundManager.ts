// Lightweight, dependency-free sound feedback.
//
// Deliberately separate from all game rules/state (src/game/*) — this
// module only reacts to events the UI tells it about; it never decides
// anything about how the game is played. Every sound is synthesized on
// the fly with the Web Audio API — no audio files, no network requests,
// nothing to download and nothing that can fail to load.

const STORAGE_KEY = 'pallanguzhi:feedbackEnabled';

let audioContext: AudioContext | null = null;
let enabled = readStoredPreference();

function readStoredPreference(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true; // localStorage can throw in some locked-down environments
  }
}

function writeStoredPreference(value: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore — the preference just won't persist this session.
  }
}

/** Shared on/off switch for both sound (this module) and haptics. */
export function isFeedbackEnabled(): boolean {
  return enabled;
}

export function setFeedbackEnabled(value: boolean): void {
  enabled = value;
  writeStoredPreference(value);
}

export function toggleFeedbackEnabled(): boolean {
  setFeedbackEnabled(!enabled);
  return enabled;
}

// Lazily created, and only ever reached from a call path that started
// with a real user gesture (a click, directly or via a move it kicked
// off) — so this never trips a browser's autoplay restrictions, and we
// never play anything before the player has interacted at all.
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null; // unsupported browser — feedback is just skipped

  if (!audioContext) {
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

interface ToneSpec {
  frequency: number;
  startOffset?: number; // seconds from now
  duration?: number; // seconds
  type?: OscillatorType;
  peakGain?: number;
}

function playTone(ctx: AudioContext, spec: ToneSpec): void {
  const {
    frequency,
    startOffset = 0,
    duration = 0.12,
    type = 'sine',
    peakGain = 0.15,
  } = spec;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const startTime = ctx.currentTime + startOffset;
  const endTime = startTime + duration;

  // Short attack/decay envelope — avoids clicky pops, keeps it brief.
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

function playIfEnabled(play: (ctx: AudioContext) => void): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  play(ctx);
}

/** A pit was chosen and its move is starting. */
export function playSelectSound(): void {
  playIfEnabled((ctx) =>
    playTone(ctx, { frequency: 520, duration: 0.07, peakGain: 0.12 })
  );
}

const SEED_TICK_MIN_INTERVAL_MS = 90;
let lastSeedTickAt = 0;

/**
 * Pure decision logic for the seed-tick throttle, exported separately so
 * it's testable with no Audio API involved: during a long relay chain,
 * seeds can land many times within milliseconds of each other, and
 * playing a tone for every single one would be an unpleasant machine-gun
 * clatter. This just says "enough time has passed to sound another one".
 */
export function shouldPlaySeedTick(
  now: number,
  lastTickAt: number,
  minIntervalMs: number
): boolean {
  return now - lastTickAt >= minIntervalMs;
}

/** A single seed just landed in a pit. Throttled — see shouldPlaySeedTick. */
export function playSeedTick(now: number = Date.now()): void {
  if (!shouldPlaySeedTick(now, lastSeedTickAt, SEED_TICK_MIN_INTERVAL_MS)) {
    return;
  }
  lastSeedTickAt = now;
  playIfEnabled((ctx) =>
    playTone(ctx, { frequency: 780, duration: 0.045, peakGain: 0.06 })
  );
}

/** A move ended with a capture. */
export function playCaptureSound(): void {
  playIfEnabled((ctx) => {
    playTone(ctx, { frequency: 660, duration: 0.09, peakGain: 0.14 });
    playTone(ctx, {
      frequency: 990,
      startOffset: 0.06,
      duration: 0.1,
      peakGain: 0.14,
    });
  });
}

/** The turn passed to the other side. */
export function playTurnChangeSound(): void {
  playIfEnabled((ctx) =>
    playTone(ctx, {
      frequency: 420,
      duration: 0.08,
      peakGain: 0.08,
      type: 'triangle',
    })
  );
}

/** The player won the game. */
export function playWinSound(): void {
  playIfEnabled((ctx) => {
    playTone(ctx, { frequency: 523, duration: 0.12, peakGain: 0.15 });
    playTone(ctx, {
      frequency: 659,
      startOffset: 0.1,
      duration: 0.12,
      peakGain: 0.15,
    });
    playTone(ctx, {
      frequency: 784,
      startOffset: 0.2,
      duration: 0.18,
      peakGain: 0.15,
    });
  });
}

/** The ai won the game. */
export function playLoseSound(): void {
  playIfEnabled((ctx) => {
    playTone(ctx, {
      frequency: 392,
      duration: 0.14,
      peakGain: 0.13,
      type: 'triangle',
    });
    playTone(ctx, {
      frequency: 294,
      startOffset: 0.12,
      duration: 0.2,
      peakGain: 0.13,
      type: 'triangle',
    });
  });
}

/** The game ended in a draw. */
export function playDrawSound(): void {
  playIfEnabled((ctx) =>
    playTone(ctx, {
      frequency: 440,
      duration: 0.16,
      peakGain: 0.12,
      type: 'triangle',
    })
  );
}
