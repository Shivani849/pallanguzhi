import type { GameState } from '../game/gameState';
import Pit from './Pit';

interface BoardProps {
  state: GameState;
}

// Renders purely from GameState — no local state, no game rules.
function Board({ state }: BoardProps) {
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
          <Pit key={pit.id} pit={pit} />
        ))}
      </div>
      <div className="pit-row pit-row--player">
        {playerPits.map((pit) => (
          <Pit key={pit.id} pit={pit} />
        ))}
      </div>
    </div>
  );
}

export default Board;
