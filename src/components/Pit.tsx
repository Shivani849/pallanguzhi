import type { Pit as PitData } from '../game/gameState';

interface PitProps {
  pit: PitData;
}

// Purely presentational — no game logic, no click handling yet.
function Pit({ pit }: PitProps) {
  return (
    <div className="pit" data-owner={pit.owner} data-index={pit.index}>
      <span className="pit-seeds">{pit.seeds}</span>
    </div>
  );
}

export default Pit;
