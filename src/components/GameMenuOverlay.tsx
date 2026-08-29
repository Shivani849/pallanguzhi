export type GameMenuView = 'closed' | 'menu' | 'confirm-restart' | 'confirm-leave';

interface GameMenuOverlayProps {
  view: GameMenuView;
  onResume: () => void;
  onRequestRestart: () => void;
  onCancelRestart: () => void;
  onConfirmRestart: () => void;
  onRequestBackToHome: () => void;
  onCancelLeave: () => void;
  onConfirmSaveAndGoHome: () => void;
}

// Purely presentational — the pause/menu overlay reachable mid-game, plus
// its two confirmation sub-views (restart, leave-to-home). Renders nothing
// while `view` is 'closed'.
function GameMenuOverlay({
  view,
  onResume,
  onRequestRestart,
  onCancelRestart,
  onConfirmRestart,
  onRequestBackToHome,
  onCancelLeave,
  onConfirmSaveAndGoHome,
}: GameMenuOverlayProps) {
  if (view === 'closed') return null;

  return (
    <div className="game-over-overlay" data-testid="game-menu-overlay">
      <div className="game-over-card">
        {view === 'menu' && (
          <>
            <h2 className="game-over-title">Game Menu</h2>
            <div className="mode-select-buttons">
              <button type="button" className="mode-button" onClick={onResume}>
                Resume
              </button>
              <button
                type="button"
                className="mode-button"
                onClick={onRequestRestart}
              >
                Restart Game
              </button>
              <button
                type="button"
                className="mode-button"
                onClick={onRequestBackToHome}
              >
                Back to Home
              </button>
            </div>
          </>
        )}

        {view === 'confirm-restart' && (
          <>
            <h2 className="game-over-title">Restart this game?</h2>
            <p className="pass-device-subtitle">
              Your current progress will be lost.
            </p>
            <div className="mode-select-buttons">
              <button
                type="button"
                className="mode-button"
                onClick={onCancelRestart}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mode-button mode-button--danger"
                onClick={onConfirmRestart}
              >
                Restart Game
              </button>
            </div>
          </>
        )}

        {view === 'confirm-leave' && (
          <>
            <h2 className="game-over-title">Leave Current Game?</h2>
            <p className="pass-device-subtitle">
              Your current game progress will be saved locally.
            </p>
            <div className="mode-select-buttons">
              <button
                type="button"
                className="mode-button"
                onClick={onCancelLeave}
              >
                Continue Playing
              </button>
              <button
                type="button"
                className="mode-button"
                onClick={onConfirmSaveAndGoHome}
              >
                Save &amp; Go Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GameMenuOverlay;
