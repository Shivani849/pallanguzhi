// Turns a MoveResult (already fully computed by the game engine) into a
// sequence of visual snapshots for the UI to play back over time.
//
// This module makes NO rules decisions — it only replays the `steps` and
// `capture` data the engine already produced (src/game/engine.ts), one
// seed/event at a time, so the board can be animated. The engine remains
// the sole source of truth for what happened; this just decides how to
// *show* it.

import type { Pit } from '../game/gameState';
import type { CaptureInfo, SowStep } from '../game/engine';

export interface TimelineFrame {
  pits: Pit[];
  activePitId: number | null; // the pit currently being sown from
  landingPitId: number | null; // the pit a seed just landed in
  capturedPitIds: number[]; // non-empty only on the final (capture) frame
}

interface ReplayableMove {
  steps: SowStep[];
  capture: CaptureInfo | null;
}

/**
 * Replays a move step by step, producing one frame per seed picked up or
 * dropped, ending with a capture frame if the move captured anything.
 *
 * Performance note: each frame reuses the same Pit object reference for
 * every pit whose seed count didn't change since the previous frame —
 * only the 1-2 pits actually touched by a given frame get a new object.
 * Combined with React.memo on the Pit component, this means a long relay
 * chain (which can produce dozens of frames in quick succession) only
 * re-renders the handful of pits that actually changed each frame,
 * instead of all 14 every time.
 */
export function buildTimeline(
  pitsBeforeMove: Pit[],
  move: ReplayableMove
): TimelineFrame[] {
  const seeds = new Map(pitsBeforeMove.map((pit) => [pit.id, pit.seeds]));
  // Mutable working copy of pit objects, updated in place as seeds move.
  // A pit's entry here only ever gets replaced (with a new object) when
  // its seed count actually changes — everything else keeps the exact
  // same reference across every frame.
  const pitsById = new Map(pitsBeforeMove.map((pit) => [pit.id, pit]));

  const frames: TimelineFrame[] = [];

  const setSeeds = (pitId: number, seedCount: number) => {
    seeds.set(pitId, seedCount);
    const current = pitsById.get(pitId);
    if (current && current.seeds !== seedCount) {
      pitsById.set(pitId, { ...current, seeds: seedCount });
    }
  };

  const snapshot = (
    activePitId: number | null,
    landingPitId: number | null,
    capturedPitIds: number[] = []
  ) => {
    frames.push({
      pits: pitsBeforeMove.map((pit) => pitsById.get(pit.id) ?? pit),
      activePitId,
      landingPitId,
      capturedPitIds,
    });
  };

  for (const step of move.steps) {
    setSeeds(step.sourcePitId, 0);
    snapshot(step.sourcePitId, null);

    for (const dropPitId of step.dropPitIds) {
      setSeeds(dropPitId, (seeds.get(dropPitId) ?? 0) + 1);
      snapshot(step.sourcePitId, dropPitId);
    }
  }

  if (move.capture) {
    const { endingPitId, capturedPitId } = move.capture;
    setSeeds(endingPitId, 0);
    setSeeds(capturedPitId, 0);
    snapshot(null, null, [endingPitId, capturedPitId]);
  }

  return frames;
}

const MIN_TOTAL_ANIMATION_MS = 900;
const MAX_TOTAL_ANIMATION_MS = 1800;

/**
 * Spreads `frameCount` frames across a roughly-constant total duration
 * (900ms–1.8s) regardless of how many frames there are, so a long relay
 * chain doesn't take much longer to watch than a short move.
 */
export function computeFrameDelayMs(frameCount: number): number {
  if (frameCount <= 0) return 0;

  const totalMs = Math.min(
    MAX_TOTAL_ANIMATION_MS,
    Math.max(MIN_TOTAL_ANIMATION_MS, frameCount * 90)
  );

  return totalMs / frameCount;
}
