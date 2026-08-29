import type { Pit as PitData } from '../game/gameState';

interface PitProps {
  pit: PitData;
  selectable: boolean;
  onSelect?: (pitId: number) => void;
  active?: boolean; // this pit is currently being sown from
  landing?: boolean; // a seed just landed here
  captured?: boolean; // this pit was just cleared by a capture
}

// Purely presentational — rendering, click reporting, and highlight
// classes only. Whether a pit is selectable/active/landing/captured is
// all decided by the caller based on game state and animation timing;
// this component just reflects it.
function Pit({
  pit,
  selectable,
  onSelect,
  active = false,
  landing = false,
  captured = false,
}: PitProps) {
  const handleClick = () => {
    if (!selectable) return;
    onSelect?.(pit.id);
  };

  const classNames = ['pit'];
  if (active) classNames.push('pit--active');
  if (landing) classNames.push('pit--landing');
  if (captured) classNames.push('pit--captured');

  return (
    <button
      type="button"
      className={classNames.join(' ')}
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
