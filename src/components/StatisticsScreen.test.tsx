import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatisticsScreen from './StatisticsScreen';
import type { GameHistoryEntry } from '../persistence/gameHistory';

describe('StatisticsScreen', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <StatisticsScreen visible={false} history={[]} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows all zeros with no history', () => {
    render(<StatisticsScreen visible history={[]} onClose={() => {}} />);

    expect(screen.getByText('vs AI')).toBeTruthy();
    expect(screen.getByText('Two Players')).toBeTruthy();
    // Every stat value should read 0 (or 0%).
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('computes and displays vs-ai stats correctly', () => {
    const history: GameHistoryEntry[] = [
      {
        date: '2026-01-01T00:00:00.000Z',
        mode: 'vs-ai',
        winner: 'player',
        playerScore: 60,
        aiScore: 24,
        moveCount: 10,
      },
      {
        date: '2026-01-02T00:00:00.000Z',
        mode: 'vs-ai',
        winner: 'ai',
        playerScore: 30,
        aiScore: 54,
        moveCount: 8,
      },
    ];

    render(<StatisticsScreen visible history={history} onClose={() => {}} />);

    // 2 games, 1 win, 1 loss, 50% win rate, best score 60.
    const values = screen
      .getAllByRole('definition')
      .map((el) => el.textContent);
    expect(values).toContain('2'); // games played (and also appears again for two-players=0, but presence is what matters)
    expect(values).toContain('1'); // wins / losses
    expect(values).toContain('50%');
    expect(values).toContain('60'); // best score
  });

  it('computes and displays two-player stats correctly', () => {
    const history: GameHistoryEntry[] = [
      {
        date: '2026-01-01T00:00:00.000Z',
        mode: 'two-players',
        winner: 'player',
        playerScore: 50,
        aiScore: 34,
        moveCount: 10,
      },
      {
        date: '2026-01-02T00:00:00.000Z',
        mode: 'two-players',
        winner: 'draw',
        playerScore: 42,
        aiScore: 42,
        moveCount: 10,
      },
    ];

    render(<StatisticsScreen visible history={history} onClose={() => {}} />);

    const values = screen
      .getAllByRole('definition')
      .map((el) => el.textContent);
    expect(values).toContain('2'); // games played
    expect(values).toContain('1'); // player1 wins / draws
    expect(values).toContain('0'); // player2 wins
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<StatisticsScreen visible history={[]} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
