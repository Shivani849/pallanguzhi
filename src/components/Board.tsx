import type { GameState } from '../game/gameState';
import Pit from './Pit';

interface BoardProps {
  state: GameState;
  validMoveIds: ReadonlySet<number>;
  onSelectPit: (pitId: number) => void;
  disabled: boolean;
}

// Renders purely from GameState (+ which pits are currently valid moves) —
// no local state, no game rules. Selectability is just validMoveIds
// membership, minus whatever the caller has globally disabled.
function Board({ state, validMoveIds, onSelectPit, disabled }: BoardProps) {
  const aiPits = state.pits
    .filter((pit) => pit.owner === 'ai')
    .sort((a, b) => a.index - b.index);

  const playerPits = state.pits
    .filter((pit) => pit.owner === 'player')
    .sort((a, b) => a.index - b.index);

  return (
    <div className="board">
      <div className="pit-row pit-row--ai">
        {aiPits.map((pit) => (
          <Pit
            key={pit.id}
            pit={pit}
            selectable={!disabled && validMoveIds.has(pit.id)}
            onSelect={onSelectPit}
          />
        ))}
      </div>
      <div className="pit-row pit-row--player">
        {playerPits.map((pit) => (
          <Pit
            key={pit.id}
            pit={pit}
            selectable={!disabled && validMoveIds.has(pit.id)}
            onSelect={onSelectPit}
          />
        ))}
      </div>
    </div>
  );
}

export default Board;
