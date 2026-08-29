import type { GameMode } from '../gameMode';

interface HomeScreenProps {
  hasUnfinishedGame: boolean;
  onSelectMode: (mode: GameMode) => void;
  onContinueGame: () => void;
  onHowToPlay: () => void;
  onStatistics: () => void;
  showWelcomePrompt: boolean;
  onLearnToPlay: () => void;
  onDismissWelcomePrompt: () => void;
}

// The app's main entry point. Purely presentational — App decides whether
// a resumable game exists and whether the first-time welcome prompt should
// show; this just renders whatever it's told to.
function HomeScreen({
  hasUnfinishedGame,
  onSelectMode,
  onContinueGame,
  onHowToPlay,
  onStatistics,
  showWelcomePrompt,
  onLearnToPlay,
  onDismissWelcomePrompt,
}: HomeScreenProps) {
  return (
    <div className="mode-select">
      <h1 className="app-title">Pallanguzhi</h1>

      {showWelcomePrompt ? (
        <div className="welcome-prompt">
          <p className="pass-device-subtitle">New to Pallanguzhi?</p>
          <div className="mode-select-buttons">
            <button
              type="button"
              className="mode-button"
              onClick={onLearnToPlay}
            >
              Learn to Play
            </button>
            <button
              type="button"
              className="mode-button"
              onClick={onDismissWelcomePrompt}
            >
              Play Now
            </button>
          </div>
        </div>
      ) : (
        <div className="mode-select-buttons">
          {hasUnfinishedGame && (
            <button
              type="button"
              className="mode-button mode-button--primary"
              onClick={onContinueGame}
            >
              Continue Game
            </button>
          )}
          <button
            type="button"
            className="mode-button"
            onClick={() => onSelectMode('vs-ai')}
          >
            Play vs AI
          </button>
          <button
            type="button"
            className="mode-button"
            onClick={() => onSelectMode('two-players')}
          >
            Two Players
          </button>
          <button type="button" className="mode-button" onClick={onHowToPlay}>
            How to Play
          </button>
          <button
            type="button"
            className="mode-button"
            onClick={onStatistics}
          >
            Statistics
          </button>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
