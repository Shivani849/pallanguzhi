import type { Pit as PitData } from '../game/gameState';
import Pit from './Pit';

interface BoardProps {
  pits: PitData[];
  validMoveIds: ReadonlySet<number>;
  onSelectPit: (pitId: number) => void;
  disabled: boolean;
  activePitId?: number | null;
  landingPitId?: number | null;
  capturedPitIds?: ReadonlySet<number>;
}

// Renders purely from the given pits (+ which are currently valid moves,
// and which are mid-animation) — no local state, no game rules.
function Board({
  pits,
  validMoveIds,
  onSelectPit,
  disabled,
  activePitId = null,
  landingPitId = null,
  capturedPitIds,
}: BoardProps) {
  const aiPits = pits
    .filter((pit) => pit.owner === 'ai')
    .sort((a, b) => a.index - b.index);

  const playerPits = pits
    .filter((pit) => pit.owner === 'player')
    .sort((a, b) => a.index - b.index);

  const renderPit = (pit: PitData) => (
    <Pit
      key={pit.id}
      pit={pit}
      selectable={!disabled && validMoveIds.has(pit.id)}
      onSelect={onSelectPit}
      active={pit.id === activePitId}
      landing={pit.id === landingPitId}
      captured={capturedPitIds?.has(pit.id) ?? false}
    />
  );

  return (
    <div className="board">
      <div className="pit-row pit-row--ai">{aiPits.map(renderPit)}</div>
      <div className="pit-row pit-row--player">
        {playerPits.map(renderPit)}
      </div>
    </div>
  );
}

export default Board;
