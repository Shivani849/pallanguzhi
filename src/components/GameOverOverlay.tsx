interface GameOverOverlayProps {
  title: string | null;
  leftLabel: string;
  leftScore: number;
  rightLabel: string;
  rightScore: number;
  onPlayAgain: () => void;
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
        <button type="button" className="play-again" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

export default GameOverOverlay;
