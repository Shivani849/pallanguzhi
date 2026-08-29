import type { GameStatus } from '../game/gameState';

interface GameOverOverlayProps {
  status: GameStatus;
  playerScore: number;
  aiScore: number;
  onPlayAgain: () => void;
}

function resultTitle(status: GameStatus): string | null {
  switch (status) {
    case 'player-won':
      return 'You Win!';
    case 'ai-won':
      return 'You Lose';
    case 'draw':
      return 'Draw';
    case 'in-progress':
    default:
      return null;
  }
}

// Purely presentational — renders nothing while the game is still in
// progress; the engine (src/game/engine.ts) is the sole source of truth
// for `status` and both final scores.
function GameOverOverlay({
  status,
  playerScore,
  aiScore,
  onPlayAgain,
}: GameOverOverlayProps) {
  const title = resultTitle(status);
  if (!title) return null;

  return (
    <div className="game-over-overlay" data-testid="game-over-overlay">
      <div className="game-over-card">
        <h2 className="game-over-title">{title}</h2>
        <div className="game-over-scores">
          <div className="game-over-score">
            <span className="score-label">AI</span>
            <span className="score-value">{aiScore}</span>
          </div>
          <div className="game-over-score">
            <span className="score-label">You</span>
            <span className="score-value">{playerScore}</span>
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
