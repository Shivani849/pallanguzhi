import type { GameState } from '../game/gameState';
import { chooseAIMove } from '../game/ai/AIController';
import type { PlayerController, RequestMoveOptions } from './PlayerController';

export interface AIPlayerControllerOptions {
  minThinkingMs?: number;
  maxThinkingMs?: number;
}

const DEFAULT_MIN_THINKING_MS = 500;
const DEFAULT_MAX_THINKING_MS = 1000;

// Decides ONLY which legal move to make — via the engine's own
// getValidMoves(), through chooseAIMove() — after a short randomized
// "thinking" delay so it doesn't feel instantaneous. No rules logic of
// its own.
export class AIPlayerController implements PlayerController {
  readonly kind = 'ai' as const;

  private readonly minThinkingMs: number;
  private readonly maxThinkingMs: number;
  private timeoutId: number | null = null;

  constructor(options: AIPlayerControllerOptions = {}) {
    this.minThinkingMs = options.minThinkingMs ?? DEFAULT_MIN_THINKING_MS;
    this.maxThinkingMs = options.maxThinkingMs ?? DEFAULT_MAX_THINKING_MS;
  }

  requestMove(state: GameState, { onMoveChosen }: RequestMoveOptions): void {
    const delay =
      this.minThinkingMs +
      Math.random() * (this.maxThinkingMs - this.minThinkingMs);

    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      onMoveChosen(chooseAIMove(state));
    }, delay);
  }

  cancelPendingMove(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** True while the "thinking" delay is still running. */
  isThinking(): boolean {
    return this.timeoutId !== null;
  }
}
