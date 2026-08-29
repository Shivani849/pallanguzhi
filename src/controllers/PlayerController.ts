// A PlayerController decides WHICH legal move to submit once it becomes
// its side's turn — nothing more. Whose turn it is, what counts as a
// legal move, and everything else about the rules stays entirely in the
// game engine (src/game/*); this is purely an input-source abstraction,
// so the engine (and the UI orchestrating it) can treat a human and the
// AI identically:
//
//   Game Engine  ->  Game State  ->  Player Controller
//
// The engine computes state and legality; the state is handed to
// whichever controller is "up"; the controller is the only thing that
// differs between a human and the AI.

import type { GameState } from '../game/gameState';

export interface RequestMoveOptions {
  /** Called exactly once, with the id of the pit to play. */
  onMoveChosen: (pitId: number) => void;
}

export interface PlayerController {
  readonly kind: 'human' | 'ai';

  /**
   * Called when it becomes this controller's turn to move. The
   * controller is responsible for eventually calling
   * `options.onMoveChosen(pitId)` with a legal pit id for `state`.
   */
  requestMove(state: GameState, options: RequestMoveOptions): void;

  /**
   * Cancels whatever this controller is currently working on producing
   * (an ai "thinking" timer, a pending human click) without calling
   * onMoveChosen. Safe to call even when nothing is pending.
   */
  cancelPendingMove(): void;
}
