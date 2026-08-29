import type { GameHistoryEntry } from '../persistence/gameHistory';
import { sideLabel } from '../gameMode';

interface HistoryScreenProps {
  visible: boolean;
  entries: GameHistoryEntry[];
  onClose: () => void;
}

function modeLabel(entry: GameHistoryEntry): string {
  return entry.mode === 'vs-ai' ? 'vs AI' : '2 Players';
}

function winnerLabel(entry: GameHistoryEntry): string {
  if (entry.winner === 'draw') return 'Draw';
  return `${sideLabel(entry.mode, entry.winner)} won`;
}

// Purely presentational — a simple read-only viewer for the locally
// stored history of completed games. Renders nothing while `visible` is
// false.
function HistoryScreen({ visible, entries, onClose }: HistoryScreenProps) {
  if (!visible) return null;

  const mostRecentFirst = [...entries].reverse();

  return (
    <div className="game-over-overlay" data-testid="history-overlay">
      <div className="game-over-card history-card">
        <h2 className="game-over-title">History</h2>
        {mostRecentFirst.length === 0 ? (
          <p className="pass-device-subtitle">No games played yet.</p>
        ) : (
          <ul className="history-list">
            {mostRecentFirst.map((entry, index) => (
              <li key={index} className="history-item">
                <span className="history-item-date">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <span>{modeLabel(entry)}</span>
                <span>{winnerLabel(entry)}</span>
                <span>
                  {entry.playerScore}–{entry.aiScore}
                </span>
                <span>{entry.moveCount} moves</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="play-again" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default HistoryScreen;
