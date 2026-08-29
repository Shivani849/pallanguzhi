import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameOverOverlay from './GameOverOverlay';

describe('GameOverOverlay', () => {
  it('renders nothing while the game is in progress', () => {
    const { container } = render(
      <GameOverOverlay
        status="in-progress"
        playerScore={10}
        aiScore={5}
        onPlayAgain={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows "You Win!" and both final scores when the player has won', () => {
    render(
      <GameOverOverlay
        status="player-won"
        playerScore={50}
        aiScore={34}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByText('You Win!')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
  });

  it('shows "You Lose" when the ai has won', () => {
    render(
      <GameOverOverlay
        status="ai-won"
        playerScore={20}
        aiScore={64}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByText('You Lose')).toBeTruthy();
  });

  it('shows "Draw" when the game is a draw', () => {
    render(
      <GameOverOverlay
        status="draw"
        playerScore={42}
        aiScore={42}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByText('Draw')).toBeTruthy();
  });

  it('calls onPlayAgain when the Play Again button is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <GameOverOverlay
        status="draw"
        playerScore={42}
        aiScore={42}
        onPlayAgain={onPlayAgain}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /play again/i }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
