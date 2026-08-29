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
 */
export function buildTimeline(
  pitsBeforeMove: Pit[],
  move: ReplayableMove
): TimelineFrame[] {
  const seeds = new Map(pitsBeforeMove.map((pit) => [pit.id, pit.seeds]));
  const frames: TimelineFrame[] = [];

  const snapshot = (
    activePitId: number | null,
    landingPitId: number | null,
    capturedPitIds: number[] = []
  ) => {
    frames.push({
      pits: pitsBeforeMove.map((pit) => ({
        ...pit,
        seeds: seeds.get(pit.id) ?? pit.seeds,
      })),
      activePitId,
      landingPitId,
      capturedPitIds,
    });
  };

  for (const step of move.steps) {
    seeds.set(step.sourcePitId, 0);
    snapshot(step.sourcePitId, null);

    for (const dropPitId of step.dropPitIds) {
      seeds.set(dropPitId, (seeds.get(dropPitId) ?? 0) + 1);
      snapshot(step.sourcePitId, dropPitId);
    }
  }

  if (move.capture) {
    const { endingPitId, capturedPitId } = move.capture;
    seeds.set(endingPitId, 0);
    seeds.set(capturedPitId, 0);
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
