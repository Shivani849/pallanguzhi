interface ResumeGameScreenProps {
  onContinue: () => void;
  onNewGame: () => void;
}

// Purely presentational — shown at startup only when a saved,
// still-in-progress game was found in localStorage.
function ResumeGameScreen({ onContinue, onNewGame }: ResumeGameScreenProps) {
  return (
    <div className="mode-select">
      <h1 className="app-title">Pallanguzhi</h1>
      <p className="pass-device-subtitle">You have an unfinished game.</p>
      <div className="mode-select-buttons">
        <button type="button" className="mode-button" onClick={onContinue}>
          Continue Game
        </button>
        <button type="button" className="mode-button" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}

export default ResumeGameScreen;
