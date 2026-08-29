import { computeTwoPlayerStats, computeVsAiStats } from '../persistence/gameStats';
import type { GameHistoryEntry } from '../persistence/gameHistory';

interface StatisticsScreenProps {
  visible: boolean;
  history: GameHistoryEntry[];
  onClose: () => void;
}

// Purely presentational — a simple read-only summary derived from the
// locally stored game history. Renders nothing while `visible` is false.
function StatisticsScreen({ visible, history, onClose }: StatisticsScreenProps) {
  if (!visible) return null;

  const vsAi = computeVsAiStats(history);
  const twoPlayer = computeTwoPlayerStats(history);

  return (
    <div className="game-over-overlay" data-testid="statistics-overlay">
      <div className="game-over-card stats-card">
        <h2 className="game-over-title">Statistics</h2>

        <section className="stats-section">
          <h3 className="stats-section-title">vs AI</h3>
          <dl className="stats-grid">
            <dt>Games played</dt>
            <dd>{vsAi.gamesPlayed}</dd>
            <dt>Wins</dt>
            <dd>{vsAi.wins}</dd>
            <dt>Losses</dt>
            <dd>{vsAi.losses}</dd>
            <dt>Win rate</dt>
            <dd>{vsAi.winPercentage}%</dd>
            <dt>Best score</dt>
            <dd>{vsAi.bestScore}</dd>
          </dl>
        </section>

        <section className="stats-section">
          <h3 className="stats-section-title">Two Players</h3>
          <dl className="stats-grid">
            <dt>Games played</dt>
            <dd>{twoPlayer.gamesPlayed}</dd>
            <dt>Player 1 wins</dt>
            <dd>{twoPlayer.player1Wins}</dd>
            <dt>Player 2 wins</dt>
            <dd>{twoPlayer.player2Wins}</dd>
            <dt>Draws</dt>
            <dd>{twoPlayer.draws}</dd>
          </dl>
        </section>

        <button type="button" className="play-again" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default StatisticsScreen;
