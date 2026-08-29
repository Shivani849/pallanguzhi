import { useState } from 'react';
import type { GameState } from './game/gameState';
import { createInitialGameState, getValidMoves } from './game/gameState';
import { makeMove } from './game/engine';
import Board from './components/Board';
import './App.css';

function statusLabel(state: GameState): string {
  switch (state.status) {
    case 'player-won':
      return 'You win!';
    case 'ai-won':
      return 'AI wins!';
    case 'draw':
      return "It's a draw!";
    case 'in-progress':
    default:
      return state.currentTurn === 'player' ? 'Your turn' : "AI's turn";
  }
}

function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState()
  );
  // Guards against re-entrant clicks while a move is being applied. The
  // engine is synchronous today (no animation yet), but this is the seam
  // later phases (animation, AI "thinking" delay) will hook into.
  const [isProcessing, setIsProcessing] = useState(false);

  // Only the player's own pits are ever clickable from this UI — with no
  // AI implemented yet, the ai's "valid moves" simply aren't offered as
  // something the human can click on its behalf.
  const validMoveIds = new Set(
    gameState.currentTurn === 'player'
      ? getValidMoves(gameState).map((pit) => pit.id)
      : []
  );

  const handleSelectPit = (pitId: number) => {
    if (isProcessing || gameState.status !== 'in-progress') return;
    if (!validMoveIds.has(pitId)) return; // defense-in-depth; UI already disables these

    setIsProcessing(true);
    const result = makeMove(gameState, pitId);
    setGameState(result.gameState);
    setIsProcessing(false);
  };

  return (
    <div className="app">
      <h1 className="app-title">Pallanguzhi</h1>

      <div className="scoreboard">
        <div className="score score--ai">
          <span className="score-label">AI</span>
          <span className="score-value">{gameState.aiCollectedSeeds}</span>
        </div>
        <div className="turn-indicator">{statusLabel(gameState)}</div>
        <div className="score score--player">
          <span className="score-label">You</span>
          <span className="score-value">{gameState.playerCollectedSeeds}</span>
        </div>
      </div>

      <Board
        state={gameState}
        validMoveIds={validMoveIds}
        onSelectPit={handleSelectPit}
        disabled={isProcessing}
      />
    </div>
  );
}

export default App;
