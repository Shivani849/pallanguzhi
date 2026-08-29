import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/gameState';
import { makeMove } from '../game/engine';
import { buildTimeline, computeFrameDelayMs } from '../animation/timeline';
import type { TimelineFrame } from '../animation/timeline';
import {
  getStep,
  isLastStep,
  isPitTapAllowed,
  totalSteps,
} from '../tutorial/TutorialController';
import {
  createTutorialScenario,
  TUTORIAL_OPPONENT_PIT_ID,
  TUTORIAL_PLAYER_PIT_ID,
} from '../tutorial/tutorialScenarios';
import { markTutorialCompleted } from '../persistence/onboarding';
import Board from './Board';

interface TutorialScreenProps {
  onExit: () => void;
  onPlayVsAI: () => void;
  onPlayTwoPlayers: () => void;
}

// A playable interactive tutorial that runs on the REAL game engine
// (makeMove()) and the REAL animation pipeline (buildTimeline()/
// computeFrameDelayMs()) — the same modules App.tsx uses for real games.
// It never reimplements a move or invents a fake animation.
//
// Its board/turn state is entirely local to this component: it never
// reads or writes the app's saved game or history, so entering, exiting,
// or replaying the tutorial can never touch (let alone overwrite) an
// active saved game.
function TutorialScreen({
  onExit,
  onPlayVsAI,
  onPlayTwoPlayers,
}: TutorialScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() =>
    createTutorialScenario()
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState<TimelineFrame | null>(
    null
  );

  const timeoutIdsRef = useRef<number[]>([]);
  useEffect(() => {
    const pendingTimeoutIds = timeoutIdsRef.current;
    return () => {
      pendingTimeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (isLastStep(stepIndex)) markTutorialCompleted();
  }, [stepIndex]);

  // Runs one move through the real engine and animation pipeline, then
  // advances to the next tutorial step once it settles. Used for both the
  // player's own tap (step 3) and the scripted opponent move (step 6) —
  // the tutorial doesn't need two separate code paths for "a move".
  const applyTutorialMove = useCallback(
    (pitId: number) => {
      const result = makeMove(gameState, pitId);
      const frames = buildTimeline(gameState.pits, result);

      const settle = () => {
        setGameState(result.gameState);
        setAnimationFrame(null);
        setIsAnimating(false);
        setStepIndex((index) => index + 1);
      };

      if (frames.length === 0) {
        settle();
        return;
      }

      setIsAnimating(true);
      const delayMs = computeFrameDelayMs(frames.length);
      const ownTimeoutIds: number[] = [];

      frames.forEach((frame, index) => {
        const timeoutId = window.setTimeout(() => {
          setAnimationFrame(frame);
        }, delayMs * index);
        ownTimeoutIds.push(timeoutId);
      });

      const finishTimeoutId = window.setTimeout(
        () => {
          settle();
          const spent = new Set(ownTimeoutIds);
          timeoutIdsRef.current = timeoutIdsRef.current.filter(
            (id) => !spent.has(id)
          );
        },
        delayMs * frames.length + 150
      );
      ownTimeoutIds.push(finishTimeoutId);

      timeoutIdsRef.current.push(...ownTimeoutIds);
    },
    [gameState]
  );

  const step = getStep(stepIndex);

  const handlePitTap = (pitId: number) => {
    if (isAnimating) return;
    if (!isPitTapAllowed(stepIndex, pitId)) return;
    applyTutorialMove(pitId);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setStepIndex((index) => index + 1);
  };

  const handleWatchOpponentMove = () => {
    if (isAnimating) return;
    applyTutorialMove(TUTORIAL_OPPONENT_PIT_ID);
  };

  const displayPits = animationFrame?.pits ?? gameState.pits;
  const validMoveIds = new Set<number>(
    step.kind === 'awaiting-tap' && !isAnimating
      ? [TUTORIAL_PLAYER_PIT_ID]
      : []
  );

  return (
    <div className="tutorial-screen">
      <div className="tutorial-header">
        <span className="tutorial-step-count">
          Step {stepIndex + 1} of {totalSteps()}
        </span>
        <button type="button" className="tutorial-exit" onClick={onExit}>
          Exit Tutorial
        </button>
      </div>

      <h1 className="app-title">Pallanguzhi</h1>

      <div className="scoreboard">
        <div className="score score--ai">
          <span className="score-label">Opponent</span>
          <span className="score-value">{gameState.aiCollectedSeeds}</span>
        </div>
        <div className="score score--player">
          <span className="score-label">You</span>
          <span className="score-value">{gameState.playerCollectedSeeds}</span>
        </div>
      </div>

      <Board
        pits={displayPits}
        validMoveIds={validMoveIds}
        onSelectPit={handlePitTap}
        disabled={isAnimating || step.kind !== 'awaiting-tap'}
        activePitId={animationFrame?.activePitId ?? null}
        landingPitId={animationFrame?.landingPitId ?? null}
        capturedPitIds={new Set(animationFrame?.capturedPitIds ?? [])}
        highlightedPitIds={new Set(step.highlightPitIds)}
      />

      <div className="tutorial-message-card">
        <p className="tutorial-message">{step.message}</p>

        {step.kind === 'info' && (
          <button type="button" className="mode-button" onClick={handleNext}>
            Next
          </button>
        )}

        {step.kind === 'awaiting-move' && (
          <button
            type="button"
            className="mode-button"
            onClick={handleWatchOpponentMove}
            disabled={isAnimating}
          >
            Show Opponent&apos;s Move
          </button>
        )}

        {step.kind === 'complete' && (
          <div className="mode-select-buttons">
            <button type="button" className="mode-button" onClick={onPlayVsAI}>
              Play vs AI
            </button>
            <button
              type="button"
              className="mode-button"
              onClick={onPlayTwoPlayers}
            >
              Play Two Players
            </button>
            <button type="button" className="mode-button" onClick={onExit}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TutorialScreen;
