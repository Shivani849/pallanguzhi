import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameOverOverlay from './GameOverOverlay';

describe('GameOverOverlay', () => {
  it('renders nothing while the game is in progress (title is null)', () => {
    const { container } = render(
      <GameOverOverlay
        title={null}
        leftLabel="AI"
        leftScore={5}
        rightLabel="You"
        rightScore={10}
        onPlayAgain={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows the given title and both score labels/values', () => {
    render(
      <GameOverOverlay
        title="You Win!"
        leftLabel="AI"
        leftScore={34}
        rightLabel="You"
        rightScore={50}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByText('You Win!')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('works with arbitrary labels (e.g. two-player mode)', () => {
    render(
      <GameOverOverlay
        title="Player 1 Wins!"
        leftLabel="Player 2"
        leftScore={20}
        rightLabel="Player 1"
        rightScore={64}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByText('Player 1 Wins!')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('Player 1')).toBeTruthy();
  });

  it('calls onPlayAgain when the Play Again button is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <GameOverOverlay
        title="Draw"
        leftLabel="AI"
        leftScore={42}
        rightLabel="You"
        rightScore={42}
        onPlayAgain={onPlayAgain}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /play again/i }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('does not show a Back to Home button when onBackToHome is not given', () => {
    render(
      <GameOverOverlay
        title="Draw"
        leftLabel="AI"
        leftScore={1}
        rightLabel="You"
        rightScore={1}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /back to home/i })).toBeNull();
  });

  it('calls onBackToHome when the Back to Home button is clicked', () => {
    const onBackToHome = vi.fn();
    render(
      <GameOverOverlay
        title="You Win!"
        leftLabel="AI"
        leftScore={20}
        rightLabel="You"
        rightScore={64}
        onPlayAgain={() => {}}
        onBackToHome={onBackToHome}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));

    expect(onBackToHome).toHaveBeenCalledTimes(1);
  });
});
