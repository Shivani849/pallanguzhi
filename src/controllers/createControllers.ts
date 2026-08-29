import type { Owner } from '../game/gameState';
import type { GameMode } from '../gameMode';
import type { PlayerController } from './PlayerController';
import { HumanPlayerController } from './HumanPlayerController';
import { AIPlayerController } from './AIPlayerController';

export type Controllers = Record<Owner, PlayerController>;

/**
 * vs-ai: a human plays the 'player' seat, the AI plays the 'ai' seat.
 * two-players: a human plays both seats (passing the device between
 * turns) — the 'ai' seat's name is just the engine's internal label for
 * "the other side"; nothing about it implies AI control.
 */
export function createControllers(mode: GameMode): Controllers {
  return {
    player: new HumanPlayerController(),
    ai:
      mode === 'vs-ai' ? new AIPlayerController() : new HumanPlayerController(),
  };
}

export function isHumanController(
  controller: PlayerController
): controller is HumanPlayerController {
  return controller.kind === 'human';
}
