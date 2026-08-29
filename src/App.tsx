import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from './game/gameState';
import { createInitialGameState, getValidMoves } from './game/gameState';
import { makeMove } from './game/engine';
import { chooseAIMove } from './game/ai/AIController';
import { buildTimeline, computeFrameDelayMs } from './animation/timeline';
import type { TimelineFrame } from './animation/timeline';
import Board from './components/Board';
import GameOverOverlay from './components/GameOverOverlay';
import './App.css';

const AI_THINKING_MIN_MS = 500;
const AI_THINKING_MAX_MS = 1000;

function statusLabel(state: GameState): string {
  switch (state.status) {
    case 'player-won':
      return 'You win!';
    case 'ai-won':
      return 'AI wins!';
    case 'draw':
      return "It's a draw!";
    case 'in-progress':
    default:
      return state.currentTurn === 'player' ? 'Your turn' : "AI's turn";
  }
}

function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState()
  );
  // True for the entire duration of a move's playback, set synchronously
  // the instant a move starts so input is blocked immediately — not just
  // once the first animation frame timer fires.
  const [isAnimating, setIsAnimating] = useState(false);
  // The current visual snapshot to render while animating; null once the
  // move commits (or before the first frame's timer has fired yet).
  const [animationFrame, setAnimationFrame] = useState<TimelineFrame | null>(
    null
  );

  // Pending setTimeout ids, so we can cancel them if the component
  // unmounts mid-animation.
  const timeoutIdsRef = useRef<number[]>([]);
  useEffect(() => {
    // Same array instance for the component's whole lifetime — later
    // pushes onto it are still visible through this captured reference.
    const pendingTimeoutIds = timeoutIdsRef.current;
    return () => {
      pendingTimeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Executes pitId as a move from fromState via the game engine's own
  // makeMove(), then plays the resulting steps back visually. Used for
  // both the player's clicks and the AI's chosen moves — there is only
  // one place a move is ever applied.
  const applyMove = useCallback((pitId: number, fromState: GameState) => {
    const result = makeMove(fromState, pitId);
    const frames = buildTimeline(fromState.pits, result);

    if (frames.length === 0) {
      setGameState(result.gameState);
      return;
    }

    setIsAnimating(true);

    const delayMs = computeFrameDelayMs(frames.length);

    frames.forEach((frame, index) => {
      const timeoutId = window.setTimeout(() => {
        setAnimationFrame(frame);
      }, delayMs * index);
      timeoutIdsRef.current.push(timeoutId);
    });

    const finishDelayMs = delayMs * frames.length + 150; // brief pause on the last frame
    const finishTimeoutId = window.setTimeout(() => {
      setGameState(result.gameState);
      setAnimationFrame(null);
      setIsAnimating(false);
    }, finishDelayMs);
    timeoutIdsRef.current.push(finishTimeoutId);
  }, []);

  const validMoveIds = new Set(
    !isAnimating && gameState.currentTurn === 'player'
      ? getValidMoves(gameState).map((pit) => pit.id)
      : []
  );

  const handleSelectPit = (pitId: number) => {
    if (isAnimating || gameState.status !== 'in-progress') return;
    if (gameState.currentTurn !== 'player') return;
    if (!validMoveIds.has(pitId)) return; // defense-in-depth; UI already disables these

    applyMove(pitId, gameState);
  };

  // Runs the AI's turn: a short "thinking" delay (during which the UI
  // already shows "AI's turn" and has all input disabled), then asks the
  // AI controller for a move and applies it exactly like a player move.
  useEffect(() => {
    if (isAnimating) return;
    if (gameState.status !== 'in-progress') return;
    if (gameState.currentTurn !== 'ai') return;

    const thinkingDelayMs =
      AI_THINKING_MIN_MS +
      Math.random() * (AI_THINKING_MAX_MS - AI_THINKING_MIN_MS);

    const timeoutId = window.setTimeout(() => {
      const pitId = chooseAIMove(gameState);
      applyMove(pitId, gameState);
    }, thinkingDelayMs);
    timeoutIdsRef.current.push(timeoutId);

    return () => window.clearTimeout(timeoutId);
  }, [gameState, isAnimating, applyMove]);

  // Cancels anything pending and starts a completely fresh game.
  const resetGame = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
    setIsAnimating(false);
    setAnimationFrame(null);
    setGameState(createInitialGameState());
  }, []);

  const displayPits = animationFrame?.pits ?? gameState.pits;

  return (
    <div className="app">
      <h1 className="app-title">Pallanguzhi</h1>

      <div className="scoreboard">
        <div className="score score--ai">
          <span className="score-label">AI</span>
          <span className="score-value">{gameState.aiCollectedSeeds}</span>
        </div>
        {/* Keyed by turn/status so it remounts (and replays its CSS
            transition) every time the turn or result actually changes. */}
        <div
          key={`${gameState.currentTurn}-${gameState.status}`}
          className="turn-indicator"
        >
          {statusLabel(gameState)}
        </div>
        <div className="score score--player">
          <span className="score-label">You</span>
          <span className="score-value">{gameState.playerCollectedSeeds}</span>
        </div>
      </div>

      <Board
        pits={displayPits}
        validMoveIds={validMoveIds}
        onSelectPit={handleSelectPit}
        disabled={isAnimating}
        activePitId={animationFrame?.activePitId ?? null}
        landingPitId={animationFrame?.landingPitId ?? null}
        capturedPitIds={new Set(animationFrame?.capturedPitIds ?? [])}
      />

      <GameOverOverlay
        status={gameState.status}
        playerScore={gameState.playerCollectedSeeds}
        aiScore={gameState.aiCollectedSeeds}
        onPlayAgain={resetGame}
      />
    </div>
  );
}

export default App;
