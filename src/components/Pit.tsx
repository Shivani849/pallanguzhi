import type { Pit as PitData } from '../game/gameState';

interface PitProps {
  pit: PitData;
  selectable: boolean;
  onSelect?: (pitId: number) => void;
}

// Purely presentational — rendering and click reporting only. Whether a
// pit is selectable is decided by the caller (App), based on game state;
// this component just enforces it via the native `disabled` attribute.
function Pit({ pit, selectable, onSelect }: PitProps) {
  const handleClick = () => {
    if (!selectable) return;
    onSelect?.(pit.id);
  };

  return (
    <button
      type="button"
      className="pit"
      data-testid={`pit-${pit.id}`}
      data-owner={pit.owner}
      data-index={pit.index}
      data-selectable={selectable}
      disabled={!selectable}
      onClick={handleClick}
      aria-label={`${pit.owner} pit ${pit.index + 1}, ${pit.seeds} seeds`}
    >
      <span className="pit-seeds">{pit.seeds}</span>
    </button>
  );
}

export default Pit;
