interface PassDeviceScreenProps {
  visible: boolean;
  completedPlayerLabel: string;
  nextPlayerLabel: string;
  onContinue: () => void;
}

// Purely presentational — the "hand the phone to the other player"
// interstitial for local two-player mode. Renders nothing while
// `visible` is false. Reuses the game-over card's styling for a
// consistent look, since it's the same kind of "modal moment".
function PassDeviceScreen({
  visible,
  completedPlayerLabel,
  nextPlayerLabel,
  onContinue,
}: PassDeviceScreenProps) {
  if (!visible) return null;

  return (
    <div className="game-over-overlay" data-testid="pass-device-overlay">
      <div className="game-over-card">
        <h2 className="game-over-title">
          {completedPlayerLabel}&apos;s Turn Complete
        </h2>
        <p className="pass-device-subtitle">
          Pass the device to {nextPlayerLabel}
        </p>
        <button type="button" className="play-again" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default PassDeviceScreen;
