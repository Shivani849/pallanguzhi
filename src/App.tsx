import { useEffect, useRef, useState } from 'react';
import type { GameState } from './game/gameState';
import { createInitialGameState, getValidMoves } from './game/gameState';
import { makeMove } from './game/engine';
import { buildTimeline, computeFrameDelayMs } from './animation/timeline';
import type { TimelineFrame } from './animation/timeline';
import Board from './components/Board';
import './App.css';

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

  const validMoveIds = new Set(
    !isAnimating && gameState.currentTurn === 'player'
      ? getValidMoves(gameState).map((pit) => pit.id)
      : []
  );

  const handleSelectPit = (pitId: number) => {
    if (isAnimating || gameState.status !== 'in-progress') return;
    if (!validMoveIds.has(pitId)) return; // defense-in-depth; UI already disables these

    // The engine computes the entire move up front, independent of the
    // animation — the UI only decides how to play back what already
    // happened.
    const result = makeMove(gameState, pitId);
    const frames = buildTimeline(gameState.pits, result);

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
  };

  const displayPits = animationFrame?.pits ?? gameState.pits;

  return (
    <div className="app">
      <h1 className="app-title">Pallanguzhi</h1>

      <div className="scoreboard">
        <div className="score score--ai">
          <span className="score-label">AI</span>
          <span className="score-value">{gameState.aiCollectedSeeds}</span>
        </div>
        <div className="turn-indicator">{statusLabel(gameState)}</div>
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
    </div>
  );
}

export default App;
