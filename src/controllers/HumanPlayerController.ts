import type { GameState } from '../game/gameState';
import { getValidMoves } from '../game/gameState';
import type { PlayerController, RequestMoveOptions } from './PlayerController';

// Never decides a move on its own — it just holds the request open until
// the UI calls submitMove() with whatever pit the human tapped. Used for
// both seats in two-players mode (a different human is "at" each one)
// and the player's own seat in vs-ai mode.
export class HumanPlayerController implements PlayerController {
  readonly kind = 'human' as const;

  private pending: {
    state: GameState;
    onMoveChosen: (pitId: number) => void;
  } | null = null;

  requestMove(state: GameState, { onMoveChosen }: RequestMoveOptions): void {
    this.pending = { state, onMoveChosen };
  }

  cancelPendingMove(): void {
    this.pending = null;
  }

  /** True while waiting for the UI to report a tap. */
  isAwaitingInput(): boolean {
    return this.pending !== null;
  }

  /**
   * Called by the UI when the human taps a pit. Re-validates against
   * the engine's own getValidMoves() before accepting — so an illegal
   * tap (already prevented by the UI disabling those pits) is also
   * rejected here, defense-in-depth. Returns true if the move was
   * accepted (and onMoveChosen was called), false otherwise.
   */
  submitMove(pitId: number): boolean {
    if (!this.pending) return false;

    const { state, onMoveChosen } = this.pending;
    const isLegal = getValidMoves(state).some((pit) => pit.id === pitId);
    if (!isLegal) return false;

    this.pending = null;
    onMoveChosen(pitId);
    return true;
  }
}
