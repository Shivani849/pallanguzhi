import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from './game/gameState';
import { createInitialGameState, getValidMoves } from './game/gameState';
import { makeMove } from './game/engine';
import { chooseAIMove } from './game/ai/AIController';
import { buildTimeline, computeFrameDelayMs } from './animation/timeline';
import type { TimelineFrame } from './animation/timeline';
import type { GameMode } from './gameMode';
import { opponentOf, overlayTitle, sideLabel, turnStatusLabel } from './gameMode';
import {
  isFeedbackEnabled,
  playCaptureSound,
  playDrawSound,
  playLoseSound,
  playSeedTick,
  playSelectSound,
  playTurnChangeSound,
  playWinSound,
  toggleFeedbackEnabled,
} from './audio/soundManager';
import { hapticSelect } from './audio/haptics';
import Board from './components/Board';
import GameOverOverlay from './components/GameOverOverlay';
import PassDeviceScreen from './components/PassDeviceScreen';
import ModeSelectScreen from './components/ModeSelectScreen';
import './App.css';

const AI_THINKING_MIN_MS = 500;
const AI_THINKING_MAX_MS = 1000;

function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
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
  const [audioEnabled, setAudioEnabled] = useState(() => isFeedbackEnabled());
  // Two-players mode only: true right after a move commits (and the game
  // hasn't ended), blocking the board until the next player taps Continue
  // on the "pass the device" screen.
  const [awaitingPassDevice, setAwaitingPassDevice] = useState(false);

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
  // the player's clicks in both modes, and for the ai's chosen moves in
  // vs-ai mode — there is only one place a move is ever applied. Sound
  // feedback is layered on here too, purely reacting to what the engine
  // already decided — none of it feeds back into gameplay.
  const applyMove = useCallback(
    (pitId: number, fromState: GameState) => {
      const result = makeMove(fromState, pitId);
      const frames = buildTimeline(fromState.pits, result);

      // Sound only, deliberately no haptics here — this always fires from
      // a setTimeout, and browsers require navigator.vibrate() to be
      // called synchronously within a real gesture's call stack (see
      // haptics.ts).
      const playEndOfMoveFeedback = () => {
        if (result.gameOver) {
          if (result.status === 'player-won') {
            playWinSound();
          } else if (result.status === 'ai-won') {
            playLoseSound();
          } else if (result.status === 'draw') {
            playDrawSound();
          }
        } else {
          playTurnChangeSound();
        }
      };

      const settle = () => {
        setGameState(result.gameState);
        setAnimationFrame(null);
        setIsAnimating(false);
        playEndOfMoveFeedback();
        // In two-players mode, every completed move (that doesn't end
        // the game) hands off to the pass-device screen before the next
        // player can act.
        if (mode === 'two-players' && !result.gameOver) {
          setAwaitingPassDevice(true);
        }
      };

      if (frames.length === 0) {
        settle();
        return;
      }

      setIsAnimating(true);

      const delayMs = computeFrameDelayMs(frames.length);

      // Tracked separately from the shared ref so this move's own ids can
      // be pruned back out once they've all fired — otherwise
      // timeoutIdsRef would grow for as long as the app stays open, one
      // entry per frame of every move ever played (harmless numbers, but
      // needless growth over a long session).
      const ownTimeoutIds: number[] = [];

      frames.forEach((frame, index) => {
        const timeoutId = window.setTimeout(() => {
          setAnimationFrame(frame);
          // Per-seed feedback: a soft tick for an ordinary landing, a
          // richer chime for a capture. playSeedTick() throttles itself
          // so a long relay chain doesn't turn into a machine-gun
          // clatter. Sound only — no haptic here, see haptics.ts for why.
          if (frame.capturedPitIds.length > 0) {
            playCaptureSound();
          } else if (frame.landingPitId !== null) {
            playSeedTick();
          }
        }, delayMs * index);
        ownTimeoutIds.push(timeoutId);
      });

      const finishDelayMs = delayMs * frames.length + 150; // brief pause on the last frame
      const finishTimeoutId = window.setTimeout(() => {
        settle();
        // This move is fully done — its ids can never fire again, so
        // drop them from the shared cleanup list.
        const spent = new Set(ownTimeoutIds);
        timeoutIdsRef.current = timeoutIdsRef.current.filter(
          (id) => !spent.has(id)
        );
      }, finishDelayMs);
      ownTimeoutIds.push(finishTimeoutId);

      timeoutIdsRef.current.push(...ownTimeoutIds);
    },
    [mode]
  );

  // In vs-ai mode only the player's own pits are ever offered; in
  // two-players mode, whichever side's turn it is gets offered, since
  // both sides are a human sitting at this same device.
  const isHumanTurnRightNow =
    mode === 'two-players' || gameState.currentTurn === 'player';

  const validMoveIds = new Set(
    mode && !isAnimating && !awaitingPassDevice && isHumanTurnRightNow
      ? getValidMoves(gameState).map((pit) => pit.id)
      : []
  );

  const handleSelectPit = (pitId: number) => {
    if (!mode) return;
    if (isAnimating || awaitingPassDevice) return;
    if (gameState.status !== 'in-progress') return;
    if (mode === 'vs-ai' && gameState.currentTurn !== 'player') return;
    if (!validMoveIds.has(pitId)) return; // defense-in-depth; UI already disables these

    playSelectSound();
    hapticSelect();
    applyMove(pitId, gameState);
  };

  // Runs the ai's turn in vs-ai mode only: a short "thinking" delay
  // (during which the UI already shows "AI's turn" and has all input
  // disabled), then asks the AI controller for a move and applies it
  // exactly like a player move. Never runs in two-players mode — there
  // is no AI seat to act for.
  useEffect(() => {
    if (mode !== 'vs-ai') return;
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

    return () => {
      window.clearTimeout(timeoutId);
      // Whether this fired already (harmless no-op clear above) or got
      // cancelled early, it can't fire again — drop it from the shared
      // cleanup list so it doesn't accumulate for the life of the app.
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (id) => id !== timeoutId
      );
    };
  }, [mode, gameState, isAnimating, applyMove]);

  // Cancels anything pending and starts a completely fresh game, keeping
  // whichever mode is currently active.
  const startNewGame = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
    setIsAnimating(false);
    setAnimationFrame(null);
    setAwaitingPassDevice(false);
    setGameState(createInitialGameState());
  }, []);

  const handleSelectMode = (chosenMode: GameMode) => {
    setMode(chosenMode);
    startNewGame();
  };

  const handleToggleAudio = () => {
    const nowEnabled = toggleFeedbackEnabled();
    setAudioEnabled(nowEnabled);
    // A quick confirmation chime when turning sound back on — none when
    // muting, since that would defeat the point.
    if (nowEnabled) playSelectSound();
  };

  const displayPits = animationFrame?.pits ?? gameState.pits;

  return (
    <div className="app">
      <button
        type="button"
        className="sound-toggle"
        onClick={handleToggleAudio}
        aria-label={audioEnabled ? 'Mute sound' : 'Unmute sound'}
        aria-pressed={audioEnabled}
      >
        {audioEnabled ? '🔊' : '🔈'}
      </button>

      {!mode ? (
        <ModeSelectScreen onSelectMode={handleSelectMode} />
      ) : (
        <>
          <h1 className="app-title">Pallanguzhi</h1>

          <div className="scoreboard">
            <div className="score score--ai">
              <span className="score-label">{sideLabel(mode, 'ai')}</span>
              <span className="score-value">
                {gameState.aiCollectedSeeds}
              </span>
            </div>
            {/* Keyed by turn/status so it remounts (and replays its CSS
                transition) every time the turn or result actually changes. */}
            <div
              key={`${gameState.currentTurn}-${gameState.status}`}
              className="turn-indicator"
            >
              {turnStatusLabel(mode, gameState)}
            </div>
            <div className="score score--player">
              <span className="score-label">{sideLabel(mode, 'player')}</span>
              <span className="score-value">
                {gameState.playerCollectedSeeds}
              </span>
            </div>
          </div>

          <Board
            pits={displayPits}
            validMoveIds={validMoveIds}
            onSelectPit={handleSelectPit}
            disabled={isAnimating || awaitingPassDevice}
            activePitId={animationFrame?.activePitId ?? null}
            landingPitId={animationFrame?.landingPitId ?? null}
            capturedPitIds={new Set(animationFrame?.capturedPitIds ?? [])}
          />

          <PassDeviceScreen
            visible={awaitingPassDevice}
            completedPlayerLabel={sideLabel(mode, opponentOf(gameState.currentTurn))}
            nextPlayerLabel={sideLabel(mode, gameState.currentTurn)}
            onContinue={() => setAwaitingPassDevice(false)}
          />

          <GameOverOverlay
            title={overlayTitle(mode, gameState.status)}
            leftLabel={sideLabel(mode, 'ai')}
            leftScore={gameState.aiCollectedSeeds}
            rightLabel={sideLabel(mode, 'player')}
            rightScore={gameState.playerCollectedSeeds}
            onPlayAgain={startNewGame}
          />
        </>
      )}
    </div>
  );
}

export default App;
