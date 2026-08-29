import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createInitialGameState } from '../game/gameState';
import Board from './Board';

describe('Board', () => {
  it('renders all 14 pits', () => {
    const state = createInitialGameState();
    render(
      <Board
        pits={state.pits}
        validMoveIds={new Set()}
        onSelectPit={() => {}}
        disabled={false}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(14);
  });

  it('only enables pits present in validMoveIds', () => {
    const state = createInitialGameState();
    render(
      <Board
        pits={state.pits}
        validMoveIds={new Set([7, 8])}
        onSelectPit={() => {}}
        disabled={false}
      />
    );

    const enabled = screen.getAllByRole('button');
    for (const button of enabled as HTMLButtonElement[]) {
      const pitId = Number(button.dataset.testid?.replace('pit-', ''));
      if (pitId === 7 || pitId === 8) {
        expect(button.disabled).toBe(false);
      } else {
        expect(button.disabled).toBe(true);
      }
    }
  });

  it('calls onSelectPit with the id of the clicked, enabled pit', () => {
    const state = createInitialGameState();
    const onSelectPit = vi.fn();
    render(
      <Board
        pits={state.pits}
        validMoveIds={new Set([7])}
        onSelectPit={onSelectPit}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByTestId('pit-7'));

    expect(onSelectPit).toHaveBeenCalledWith(7);
  });

  it('disables every pit when `disabled` is true, even valid ones', () => {
    const state = createInitialGameState();
    render(
      <Board
        pits={state.pits}
        validMoveIds={new Set([7])}
        onSelectPit={() => {}}
        disabled
      />
    );

    const button = screen.getByTestId('pit-7') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('marks the active, landing, and captured pits with the right highlight classes', () => {
    const state = createInitialGameState();
    render(
      <Board
        pits={state.pits}
        validMoveIds={new Set()}
        onSelectPit={() => {}}
        disabled={false}
        activePitId={7}
        landingPitId={8}
        capturedPitIds={new Set([9, 10])}
      />
    );

    expect(screen.getByTestId('pit-7').className).toContain('pit--active');
    expect(screen.getByTestId('pit-8').className).toContain('pit--landing');
    expect(screen.getByTestId('pit-9').className).toContain('pit--captured');
    expect(screen.getByTestId('pit-10').className).toContain(
      'pit--captured'
    );
    expect(screen.getByTestId('pit-11').className).not.toContain('pit--');
  });
});
