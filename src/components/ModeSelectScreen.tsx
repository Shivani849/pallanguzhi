import type { GameMode } from '../gameMode';

interface ModeSelectScreenProps {
  onSelectMode: (mode: GameMode) => void;
}

// Purely presentational — the very first screen: choose how to play.
function ModeSelectScreen({ onSelectMode }: ModeSelectScreenProps) {
  return (
    <div className="mode-select">
      <h1 className="app-title">Pallanguzhi</h1>
      <div className="mode-select-buttons">
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
      </div>
    </div>
  );
}

export default ModeSelectScreen;
