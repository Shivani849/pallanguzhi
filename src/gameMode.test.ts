import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './game/gameState';
import {
  opponentOf,
  overlayTitle,
  sideLabel,
  turnStatusLabel,
} from './gameMode';

describe('sideLabel', () => {
  it('calls the sides "You"/"AI" in vs-ai mode', () => {
    expect(sideLabel('vs-ai', 'player')).toBe('You');
    expect(sideLabel('vs-ai', 'ai')).toBe('AI');
  });

  it('calls the sides "Player 1"/"Player 2" in two-players mode', () => {
    expect(sideLabel('two-players', 'player')).toBe('Player 1');
    expect(sideLabel('two-players', 'ai')).toBe('Player 2');
  });
});

describe('opponentOf', () => {
  it('flips player <-> ai', () => {
    expect(opponentOf('player')).toBe('ai');
    expect(opponentOf('ai')).toBe('player');
  });
});

describe('turnStatusLabel', () => {
  it('shows "Your turn" / "AI\'s turn" in vs-ai mode', () => {
    const state = createInitialGameState();
    expect(turnStatusLabel('vs-ai', state)).toBe('Your turn');
    expect(turnStatusLabel('vs-ai', { ...state, currentTurn: 'ai' })).toBe(
      "AI's turn"
    );
  });

  it('shows "Player N\'s turn" in two-players mode', () => {
    const state = createInitialGameState();
    expect(turnStatusLabel('two-players', state)).toBe("Player 1's turn");
    expect(
      turnStatusLabel('two-players', { ...state, currentTurn: 'ai' })
    ).toBe("Player 2's turn");
  });

  it('shows the result once the game has ended, per mode', () => {
    const state = createInitialGameState();
    expect(
      turnStatusLabel('vs-ai', { ...state, status: 'player-won' })
    ).toBe('You win!');
    expect(turnStatusLabel('vs-ai', { ...state, status: 'ai-won' })).toBe(
      'AI wins!'
    );
    expect(
      turnStatusLabel('two-players', { ...state, status: 'player-won' })
    ).toBe('Player 1 wins!');
    expect(
      turnStatusLabel('two-players', { ...state, status: 'ai-won' })
    ).toBe('Player 2 wins!');
    expect(turnStatusLabel('vs-ai', { ...state, status: 'draw' })).toBe(
      "It's a draw!"
    );
    expect(turnStatusLabel('two-players', { ...state, status: 'draw' })).toBe(
      "It's a draw!"
    );
  });
});

describe('overlayTitle', () => {
  it('returns null while the game is in progress', () => {
    expect(overlayTitle('vs-ai', 'in-progress')).toBeNull();
    expect(overlayTitle('two-players', 'in-progress')).toBeNull();
  });

  it('phrases the vs-ai result from the human player\'s perspective', () => {
    expect(overlayTitle('vs-ai', 'player-won')).toBe('You Win!');
    expect(overlayTitle('vs-ai', 'ai-won')).toBe('You Lose');
    expect(overlayTitle('vs-ai', 'draw')).toBe('Draw');
  });

  it('names the winning player directly in two-players mode', () => {
    expect(overlayTitle('two-players', 'player-won')).toBe('Player 1 Wins!');
    expect(overlayTitle('two-players', 'ai-won')).toBe('Player 2 Wins!');
    expect(overlayTitle('two-players', 'draw')).toBe('Draw');
  });
});
