import { describe, expect, it } from 'vitest';
import type { Pit } from '../game/gameState';
import { buildTimeline, computeFrameDelayMs } from './timeline';

function makePits(seedCounts: Record<number, number>): Pit[] {
  return Object.entries(seedCounts).map(([id, seeds]) => ({
    id: Number(id),
    owner: Number(id) < 7 ? 'ai' : 'player',
    index: Number(id) % 7,
    seeds,
  }));
}

describe('buildTimeline', () => {
  it('produces one frame per pickup and one per seed dropped, no relay/capture', () => {
    const pitsBeforeMove = makePits({ 7: 3, 8: 0, 9: 0, 10: 0 });

    const frames = buildTimeline(pitsBeforeMove, {
      steps: [{ sourcePitId: 7, seedsSown: 3, dropPitIds: [8, 9, 10] }],
      capture: null,
    });

    // 1 pickup frame + 3 drop frames = 4
    expect(frames).toHaveLength(4);

    expect(frames[0].activePitId).toBe(7);
    expect(frames[0].landingPitId).toBeNull();
    expect(frames[0].pits.find((p) => p.id === 7)?.seeds).toBe(0);

    expect(frames[1].landingPitId).toBe(8);
    expect(frames[1].pits.find((p) => p.id === 8)?.seeds).toBe(1);

    expect(frames[3].landingPitId).toBe(10);
    expect(frames[3].pits.find((p) => p.id === 10)?.seeds).toBe(1);
  });

  it('produces frames for every step of a relay chain, in order', () => {
    const pitsBeforeMove = makePits({ 7: 1, 8: 2, 9: 2, 10: 3, 11: 0 });

    const frames = buildTimeline(pitsBeforeMove, {
      steps: [
        { sourcePitId: 7, seedsSown: 1, dropPitIds: [8] },
        { sourcePitId: 8, seedsSown: 3, dropPitIds: [9, 10, 11] },
      ],
      capture: null,
    });

    // step 1: pickup + 1 drop = 2 frames; step 2: pickup + 3 drops = 4 frames
    expect(frames).toHaveLength(6);
    expect(frames.map((f) => f.landingPitId)).toEqual([
      null,
      8,
      null,
      9,
      10,
      11,
    ]);

    const finalFrame = frames[frames.length - 1];
    expect(finalFrame.pits.find((p) => p.id === 11)?.seeds).toBe(1);
  });

  it('appends a final capture frame that clears both pits', () => {
    const pitsBeforeMove = makePits({ 7: 1, 8: 0, 9: 4 });

    const frames = buildTimeline(pitsBeforeMove, {
      steps: [{ sourcePitId: 7, seedsSown: 1, dropPitIds: [8] }],
      capture: {
        endingPitId: 8,
        capturedPitId: 9,
        capturedSeeds: 5,
        capturedBy: 'player',
      },
    });

    const finalFrame = frames[frames.length - 1];
    expect(finalFrame.capturedPitIds.sort()).toEqual([8, 9]);
    expect(finalFrame.pits.find((p) => p.id === 8)?.seeds).toBe(0);
    expect(finalFrame.pits.find((p) => p.id === 9)?.seeds).toBe(0);
  });

  it('does not mutate the pits passed in', () => {
    const pitsBeforeMove = makePits({ 7: 3, 8: 0, 9: 0, 10: 0 });
    const snapshot = JSON.parse(JSON.stringify(pitsBeforeMove));

    buildTimeline(pitsBeforeMove, {
      steps: [{ sourcePitId: 7, seedsSown: 3, dropPitIds: [8, 9, 10] }],
      capture: null,
    });

    expect(pitsBeforeMove).toEqual(snapshot);
  });

  it('reuses the same pit object reference across frames when a pit is untouched (perf: lets React.memo skip re-rendering it)', () => {
    const pitsBeforeMove = makePits({
      7: 3,
      8: 0,
      9: 0,
      10: 0,
      11: 5, // never touched by this move at all
    });

    const frames = buildTimeline(pitsBeforeMove, {
      steps: [{ sourcePitId: 7, seedsSown: 3, dropPitIds: [8, 9, 10] }],
      capture: null,
    });

    const untouchedPitAcrossFrames = frames.map(
      (frame) => frame.pits.find((p) => p.id === 11)!
    );
    // Every frame's reference to the untouched pit 11 is the exact same
    // object — not just equal in value.
    for (const pit of untouchedPitAcrossFrames) {
      expect(pit).toBe(untouchedPitAcrossFrames[0]);
    }
  });

  it('gives a pit a new object reference only on the frame where its seed count actually changes', () => {
    const pitsBeforeMove = makePits({ 7: 1, 8: 0 });

    const frames = buildTimeline(pitsBeforeMove, {
      steps: [{ sourcePitId: 7, seedsSown: 1, dropPitIds: [8] }],
      capture: null,
    });

    // frame 0: pit 7 emptied (0 -> new object); pit 8 still untouched.
    // frame 1: pit 8 gets its seed (0 -> 1, new object).
    const pit8Frame0 = frames[0].pits.find((p) => p.id === 8)!;
    const pit8Frame1 = frames[1].pits.find((p) => p.id === 8)!;
    expect(pit8Frame0.seeds).toBe(0);
    expect(pit8Frame1.seeds).toBe(1);
    expect(pit8Frame0).not.toBe(pit8Frame1);
  });
});

describe('computeFrameDelayMs', () => {
  it('returns 0 for zero frames', () => {
    expect(computeFrameDelayMs(0)).toBe(0);
  });

  it('keeps total duration within the 900ms-1800ms band for typical frame counts', () => {
    for (const frameCount of [1, 2, 5, 10, 20, 40]) {
      const delay = computeFrameDelayMs(frameCount);
      const total = delay * frameCount;
      expect(total).toBeGreaterThanOrEqual(900);
      expect(total).toBeLessThanOrEqual(1800);
    }
  });
});
