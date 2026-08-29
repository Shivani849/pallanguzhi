import { createInitialGameState } from './game/gameState';
import Board from './components/Board';
import './App.css';

const initialState = createInitialGameState();

function App() {
  return (
    <div className="app">
      <h1 className="app-title">Pallanguzhi</h1>
      <Board state={initialState} />
    </div>
  );
}

export default App;
