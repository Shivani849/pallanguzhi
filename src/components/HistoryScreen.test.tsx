import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HistoryScreen from './HistoryScreen';
import type { GameHistoryEntry } from '../persistence/gameHistory';

describe('HistoryScreen', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <HistoryScreen visible={false} entries={[]} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows an empty message when there is no history', () => {
    render(<HistoryScreen visible entries={[]} onClose={() => {}} />);
    expect(screen.getByText(/no games played yet/i)).toBeTruthy();
  });

  it('lists entries, most recent first, with mode/winner/scores/moves', () => {
    const entries: GameHistoryEntry[] = [
      {
        date: '2026-01-01T00:00:00.000Z',
        mode: 'vs-ai',
        winner: 'player',
        playerScore: 50,
        aiScore: 34,
        moveCount: 12,
      },
      {
        date: '2026-01-02T00:00:00.000Z',
        mode: 'two-players',
        winner: 'ai',
        playerScore: 20,
        aiScore: 64,
        moveCount: 8,
      },
    ];

    render(<HistoryScreen visible entries={entries} onClose={() => {}} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Most recent (two-players, Jan 2) listed first.
    expect(items[0].textContent).toContain('2 Players');
    expect(items[0].textContent).toContain('Player 2 won');
    expect(items[0].textContent).toContain('20');
    expect(items[0].textContent).toContain('64');
    expect(items[0].textContent).toContain('8 moves');

    expect(items[1].textContent).toContain('vs AI');
    expect(items[1].textContent).toContain('You won');
    expect(items[1].textContent).toContain('12 moves');
  });

  it('shows "Draw" for a drawn game', () => {
    const entries: GameHistoryEntry[] = [
      {
        date: '2026-01-01T00:00:00.000Z',
        mode: 'vs-ai',
        winner: 'draw',
        playerScore: 42,
        aiScore: 42,
        moveCount: 20,
      },
    ];

    render(<HistoryScreen visible entries={entries} onClose={() => {}} />);
    expect(screen.getByText('Draw')).toBeTruthy();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<HistoryScreen visible entries={[]} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
