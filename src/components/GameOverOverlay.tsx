interface GameOverOverlayProps {
  title: string | null;
  leftLabel: string;
  leftScore: number;
  rightLabel: string;
  rightScore: number;
  onPlayAgain: () => void;
  // Optional: the game has ended, so returning home never needs a
  // confirmation dialog (see App.tsx's game-menu Back to Home, which does
  // confirm — only while a game is still unfinished). Omitted in contexts
  // that don't offer a way home from here (e.g. existing tests/usages).
  onBackToHome?: () => void;
}

// Purely presentational — renders nothing while `title` is null (i.e. the
// game is still in progress). Callers decide the title text and score
// labels, so this same component works for both vs-AI and two-player
// modes without knowing anything about either.
function GameOverOverlay({
  title,
  leftLabel,
  leftScore,
  rightLabel,
  rightScore,
  onPlayAgain,
  onBackToHome,
}: GameOverOverlayProps) {
  if (!title) return null;

  return (
    <div className="game-over-overlay" data-testid="game-over-overlay">
      <div className="game-over-card">
        <h2 className="game-over-title">{title}</h2>
        <div className="game-over-scores">
          <div className="game-over-score">
            <span className="score-label">{leftLabel}</span>
            <span className="score-value">{leftScore}</span>
          </div>
          <div className="game-over-score">
            <span className="score-label">{rightLabel}</span>
            <span className="score-value">{rightScore}</span>
          </div>
        </div>
        <div className="game-over-actions">
          <button type="button" className="play-again" onClick={onPlayAgain}>
            Play Again
          </button>
          {onBackToHome && (
            <button
              type="button"
              className="back-to-home-link"
              onClick={onBackToHome}
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameOverOverlay;
