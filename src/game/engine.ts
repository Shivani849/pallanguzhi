// Core move engine for Classic Pallanguzhi.
// See RULES.md at the project root for the full ruleset this implements.
//
// This module operates purely on data (GameState / Pit) — no React,
// no animation timing. It computes the resulting board state immediately;
// the returned `steps` give the UI everything it needs to animate the
// move later, at its own pace.

import type { GameState, GameStatus, Owner, Pit } from './gameState';
import { getAIPits, getPlayerPits, getValidMoves } from './gameState';

// One sowing pass: seeds picked up from `sourcePitId` and dropped one by
// one into `dropPitIds`, in order. A single move may contain several of
// these in sequence when relay sowing (rule 4) chains multiple passes.
export interface SowStep {
  sourcePitId: number;
  seedsSown: number;
  dropPitIds: number[];
}

export interface CaptureInfo {
  endingPitId: number; // pit where the sowing chain ended (was empty before landing)
  capturedPitId: number; // the next pit whose seeds were captured
  capturedSeeds: number; // total captured: ending pit's seed + captured pit's seeds
  capturedBy: Owner;
}

export interface MoveResult {
  gameState: GameState;
  pitsAffected: number[];
  steps: SowStep[];
  capture: CaptureInfo | null;
  nextTurn: Owner;
  gameOver: boolean;
  status: GameStatus;
}

// Safety guard against a malformed/pathological state causing an
// unbounded relay chain — not part of the ruleset itself.
const MAX_RELAY_STEPS = 1000;

// Builds the fixed sowing loop (rule 2): the mover's row in ascending
// index order, followed by the opponent's row in descending index order.
function buildSowingOrder(state: GameState): number[] {
  const playerIds = getPlayerPits(state).map((pit) => pit.id);
  const aiIds = getAIPits(state)
    .slice()
    .sort((a, b) => b.index - a.index)
    .map((pit) => pit.id);

  return [...playerIds, ...aiIds];
}

function nextPitId(order: number[], fromId: number): number {
  const position = order.indexOf(fromId);
  return order[(position + 1) % order.length];
}

/**
 * Executes a full move: pick up all seeds from `pitId`, sow them per the
 * Classic ruleset (including any relay chain), resolve a capture if one
 * applies, and return the resulting state plus everything the UI needs to
 * animate the move.
 *
 * Throws if the game isn't in progress, the pit doesn't exist, doesn't
 * belong to the player whose turn it is, or is empty.
 */
export function makeMove(gameState: GameState, pitId: number): MoveResult {
  if (gameState.status !== 'in-progress') {
    throw new Error('Cannot make a move: the game is not in progress.');
  }

  const mover = gameState.currentTurn;
  const chosenPit = getValidMoves(gameState).find((pit) => pit.id === pitId);

  if (!chosenPit) {
    throw new Error(
      `Invalid move: pit ${pitId} is not a valid move for ${mover}.`
    );
  }

  const order = buildSowingOrder(gameState);
  const seeds = new Map<number, number>(
    gameState.pits.map((pit) => [pit.id, pit.seeds])
  );

  const steps: SowStep[] = [];
  const pitsAffected = new Set<number>();

  let sourcePitId = pitId;
  let endingPitId = -1;
  let relayGuard = 0;

  for (;;) {
    if (relayGuard++ > MAX_RELAY_STEPS) {
      throw new Error('Move aborted: relay sowing exceeded safety limit.');
    }

    const seedsToSow = seeds.get(sourcePitId) ?? 0;
    seeds.set(sourcePitId, 0);
    pitsAffected.add(sourcePitId);

    const dropPitIds: number[] = [];
    let pointer = sourcePitId;
    let lastDropWasEmptyBefore = false;

    for (let i = 0; i < seedsToSow; i++) {
      pointer = nextPitId(order, pointer);
      const before = seeds.get(pointer) ?? 0;
      seeds.set(pointer, before + 1);
      dropPitIds.push(pointer);
      pitsAffected.add(pointer);

      if (i === seedsToSow - 1) {
        lastDropWasEmptyBefore = before === 0;
      }
    }

    steps.push({ sourcePitId, seedsSown: seedsToSow, dropPitIds });

    const lastDropPitId = dropPitIds[dropPitIds.length - 1];

    if (lastDropWasEmptyBefore) {
      endingPitId = lastDropPitId;
      break;
    }

    sourcePitId = lastDropPitId;
  }

  // Capture (rule 5).
  let capture: CaptureInfo | null = null;
  let playerCollectedSeeds = gameState.playerCollectedSeeds;
  let aiCollectedSeeds = gameState.aiCollectedSeeds;

  const followingPitId = nextPitId(order, endingPitId);
  const followingSeeds = seeds.get(followingPitId) ?? 0;

  if (followingSeeds > 0) {
    const endingPitSeeds = seeds.get(endingPitId) ?? 0; // always 1 here
    const capturedSeeds = endingPitSeeds + followingSeeds;

    seeds.set(endingPitId, 0);
    seeds.set(followingPitId, 0);
    pitsAffected.add(followingPitId);

    if (mover === 'player') {
      playerCollectedSeeds += capturedSeeds;
    } else {
      aiCollectedSeeds += capturedSeeds;
    }

    capture = {
      endingPitId,
      capturedPitId: followingPitId,
      capturedSeeds,
      capturedBy: mover,
    };
  }

  const newPits: Pit[] = gameState.pits.map((pit) => ({
    ...pit,
    seeds: seeds.get(pit.id) ?? pit.seeds,
  }));

  const nextTurn: Owner = mover === 'player' ? 'ai' : 'player';

  let newState: GameState = {
    pits: newPits,
    currentTurn: nextTurn,
    playerCollectedSeeds,
    aiCollectedSeeds,
    status: 'in-progress',
  };

  // Game over (rule 7): the next mover has no seeds left to play.
  const nextMoverHasMoves = getValidMoves(newState).length > 0;
  let gameOver = false;

  if (!nextMoverHasMoves) {
    gameOver = true;
    if (playerCollectedSeeds > aiCollectedSeeds) {
      newState = { ...newState, status: 'player-won' };
    } else if (aiCollectedSeeds > playerCollectedSeeds) {
      newState = { ...newState, status: 'ai-won' };
    } else {
      newState = { ...newState, status: 'draw' };
    }
  }

  return {
    gameState: newState,
    pitsAffected: Array.from(pitsAffected),
    steps,
    capture,
    nextTurn,
    gameOver,
    status: newState.status,
  };
}
