import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from './game/gameState';
import { createInitialGameState, getValidMoves } from './game/gameState';
import { makeMove } from './game/engine';
import { buildTimeline, computeFrameDelayMs } from './animation/timeline';
import type { TimelineFrame } from './animation/timeline';
import type { GameMode } from './gameMode';
import {
  opponentOf,
  overlayTitle,
  sideLabel,
  turnStatusLabel,
} from './gameMode';
import { createControllers, isHumanController } from './controllers/createControllers';
import type { SavedGame } from './persistence/gameSave';
import { clearSavedGame, loadSavedGame, saveGame } from './persistence/gameSave';
import type { GameHistoryEntry } from './persistence/gameHistory';
import { appendHistoryEntry, loadHistory } from './persistence/gameHistory';
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
import ResumeGameScreen from './components/ResumeGameScreen';
import HistoryScreen from './components/HistoryScreen';
import StatisticsScreen from './components/StatisticsScreen';
import './App.css';

// Game Engine -> Game State -> Player Controller.
//
// This component owns the GameState and asks the game engine
// (makeMove()/getValidMoves()) to compute everything about the rules.
// It never decides who's allowed to move next on its own — it just asks
// whichever PlayerController is assigned to `gameState.currentTurn` to
// produce a move, and applies whatever comes back through the exact
// same makeMove() pipeline regardless of whether that controller is a
// HumanPlayerController or an AIPlayerController.
//
// This app has no real AI difficulty selector (the AI always plays
// uniform-random moves — see game/ai/AIController.ts), so this is just a
// placeholder value persisted for a future difficulty setting.
const DEFAULT_AI_DIFFICULTY = 'normal';

function App() {
  // Checked once, at mount: is there an unfinished game saved locally?
  const [pendingResume, setPendingResume] = useState<SavedGame | null>(() =>
    loadSavedGame()
  );
  const [history, setHistory] = useState<GameHistoryEntry[]>(() =>
    loadHistory()
  );
  const [historyVisible, setHistoryVisible] = useState(false);
  const [statisticsVisible, setStatisticsVisible] = useState(false);

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

  // How many moves have been played in the current game — persisted with
  // the save, and recorded in history once the game ends. Doesn't need to
  // be React state: nothing ever needs to re-render off of it directly.
  const moveCountRef = useRef(0);

  // One controller per seat ('player'/'ai'), assigned according to mode.
  // Recreated only when the mode changes — a fresh pair for a fresh
  // choice of vs-ai vs two-players.
  const controllers = useMemo(
    () => (mode ? createControllers(mode) : null),
    [mode]
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
  // makeMove(), then plays the resulting steps back visually. Called via
  // whichever controller produced pitId — human or ai — so there is only
  // one place a move is ever applied. Sound feedback is layered on here
  // too, purely reacting to what the engine already decided — none of it
  // feeds back into gameplay.
  const applyMove = useCallback(
    (pitId: number, fromState: GameState) => {
      if (!mode) return; // defensive: a move should never be requested before a mode is chosen

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
        moveCountRef.current += 1;

        // Save after every completed turn — either the finished-game
        // result goes into history and the in-progress save is cleared,
        // or the still-unfinished game is (re-)saved so it can be
        // resumed later.
        if (result.gameOver) {
          clearSavedGame();
          const entry: GameHistoryEntry = {
            date: new Date().toISOString(),
            mode,
            winner:
              result.status === 'player-won'
                ? 'player'
                : result.status === 'ai-won'
                  ? 'ai'
                  : 'draw',
            playerScore: result.gameState.playerCollectedSeeds,
            aiScore: result.gameState.aiCollectedSeeds,
            moveCount: moveCountRef.current,
          };
          setHistory(appendHistoryEntry(entry));
        } else {
          saveGame({
            mode,
            difficulty: mode === 'vs-ai' ? DEFAULT_AI_DIFFICULTY : null,
            gameState: result.gameState,
            moveCount: moveCountRef.current,
          });
        }

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

  // Whenever it becomes someone's turn (and nothing is animating or
  // blocking on the pass-device screen), ask that seat's controller to
  // produce a move. For a HumanPlayerController this just arms it to
  // accept the UI's next submitMove() call; for an AIPlayerController
  // this kicks off its "thinking" timer. Either way, the same applyMove()
  // runs once a pit id comes back — the engine never knows or cares
  // which kind of controller supplied it.
  useEffect(() => {
    if (!mode || !controllers) return;
    if (isAnimating || awaitingPassDevice) return;
    if (gameState.status !== 'in-progress') return;

    const controller = controllers[gameState.currentTurn];
    controller.requestMove(gameState, {
      onMoveChosen: (pitId) => applyMove(pitId, gameState),
    });

    return () => controller.cancelPendingMove();
  }, [mode, controllers, gameState, isAnimating, awaitingPassDevice, applyMove]);

  const currentController = mode && controllers ? controllers[gameState.currentTurn] : null;
  const isHumanTurnRightNow =
    currentController !== null && isHumanController(currentController);

  const validMoveIds = new Set(
    mode && !isAnimating && !awaitingPassDevice && isHumanTurnRightNow
      ? getValidMoves(gameState).map((pit) => pit.id)
      : []
  );

  // Wrapped in useCallback so this stays referentially stable across the
  // repeated re-renders during a move's animation (gameState/isAnimating
  // don't change frame-to-frame, only animationFrame does) — otherwise
  // every Board/Pit down the tree would see a "new" onSelect prop each
  // frame and React.memo on Pit (see Pit.tsx) couldn't skip anything.
  const handleSelectPit = useCallback(
    (pitId: number) => {
      if (!mode || !controllers) return;
      if (isAnimating || awaitingPassDevice) return;
      if (gameState.status !== 'in-progress') return;

      const controller = controllers[gameState.currentTurn];
      if (!isHumanController(controller)) return;

      // The controller itself re-validates legality before accepting;
      // only play tap feedback if the move was actually accepted.
      const accepted = controller.submitMove(pitId);
      if (accepted) {
        playSelectSound();
        hapticSelect();
      }
    },
    [mode, controllers, isAnimating, awaitingPassDevice, gameState]
  );

  // Cancels anything pending and starts a completely fresh game, keeping
  // whichever mode is currently active.
  const startNewGame = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
    controllers?.player.cancelPendingMove();
    controllers?.ai.cancelPendingMove();
    moveCountRef.current = 0;
    setIsAnimating(false);
    setAnimationFrame(null);
    setAwaitingPassDevice(false);
    setGameState(createInitialGameState());
  }, [controllers]);

  const handleSelectMode = (chosenMode: GameMode) => {
    setMode(chosenMode);
    startNewGame();
  };

  // Restores exactly the saved snapshot — same mode, same board, same
  // move count — and lets play continue from there.
  const handleContinueGame = () => {
    if (!pendingResume) return;
    moveCountRef.current = pendingResume.moveCount;
    setMode(pendingResume.mode);
    setGameState(pendingResume.gameState);
    setIsAnimating(false);
    setAnimationFrame(null);
    setAwaitingPassDevice(false);
    setPendingResume(null);
  };

  const handleDiscardResumeAndStartNew = () => {
    clearSavedGame();
    setPendingResume(null);
    // mode stays null — the mode-select screen shows next.
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
      <div className="top-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => setStatisticsVisible(true)}
          aria-label="View statistics"
        >
          📊
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setHistoryVisible(true)}
          aria-label="View game history"
        >
          📜
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={handleToggleAudio}
          aria-label={audioEnabled ? 'Mute sound' : 'Unmute sound'}
          aria-pressed={audioEnabled}
        >
          {audioEnabled ? '🔊' : '🔈'}
        </button>
      </div>

      {pendingResume ? (
        <ResumeGameScreen
          onContinue={handleContinueGame}
          onNewGame={handleDiscardResumeAndStartNew}
        />
      ) : !mode ? (
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

      <HistoryScreen
        visible={historyVisible}
        entries={history}
        onClose={() => setHistoryVisible(false)}
      />

      <StatisticsScreen
        visible={statisticsVisible}
        history={history}
        onClose={() => setStatisticsVisible(false)}
      />
    </div>
  );
}

export default App;
