import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { STARTING_SEEDS_PER_PIT } from './game/gameState';

const TOTAL_SEEDS = STARTING_SEEDS_PER_PIT * 14;

function totalSeedsOnBoard(): number {
  return screen
    .getAllByRole('button')
    .reduce((sum, button) => sum + Number(button.textContent), 0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('shows the initial board with 0-0 score and the player to move', () => {
    render(<App />);

    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(14);
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
  });

  it('only enables the player pits at the start (not the ai pits)', () => {
    render(<App />);

    for (let id = 0; id <= 6; id++) {
      expect(
        (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      ).toBe(true);
    }
    for (let id = 7; id <= 13; id++) {
      expect(
        (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      ).toBe(false);
    }
  });

  it("clicking an invalid (ai) pit does nothing while it is the player's turn", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-0')); // an ai pit, disabled

    // still the player's turn, board unchanged
    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
  });

  it('disables every pit immediately while the move animation is in progress', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-7'));

    // Animation is running (timers haven't been flushed yet) — nothing
    // should be clickable, and the committed game state hasn't changed.
    for (const button of screen.getAllByRole('button') as HTMLButtonElement[]) {
      expect(button.disabled).toBe(true);
    }
    expect(screen.getByText('Your turn')).toBeTruthy();
  });

  it('animates seed distribution, then shows the final state and switches the turn', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-7'));

    // Flush every scheduled animation frame + the final commit.
    act(() => {
      vi.runAllTimers();
    });

    // The board must have changed from the initial all-6s state — some
    // relay chain of sowing happened. (With a fully-loaded initial board,
    // relay sowing can wrap all the way back around, so we don't assert
    // the clicked pit's exact final count — just that seeds moved.)
    const unchangedEverywhere = [...Array(14).keys()].every(
      (id) => Number(screen.getByTestId(`pit-${id}`).textContent) === 6
    );
    expect(unchangedEverywhere).toBe(false);

    // Total seeds are conserved between the board and both collected totals.
    const playerScore = Number(
      screen.getByText('You').nextSibling?.textContent
    );
    const aiScore = Number(screen.getByText('AI').nextSibling?.textContent);
    expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);

    // Turn has switched to the ai. Its own "thinking" timer hasn't fired
    // yet (still pending in the fake-timer queue), so it hasn't moved.
    expect(screen.queryByText('Your turn')).toBeNull();
    expect(screen.getByText("AI's turn")).toBeTruthy();

    // No pit should be clickable now, since it isn't the player's turn.
    for (const button of screen.getAllByRole('button') as HTMLButtonElement[]) {
      expect(button.disabled).toBe(true);
    }

    // Animation highlight classes are gone once a move has fully committed.
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).not.toContain('pit--active');
      expect(button.className).not.toContain('pit--landing');
    }
  });

  it('plays a full player → ai → player turn cycle', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-7'));

    // First flush: the player's move animation + commit. This turns it
    // to the ai's turn, whose useEffect then schedules its own
    // "thinking" timer — which only exists in the fake-timer queue once
    // React has committed and run that effect, i.e. after this act()
    // call returns. A single runAllTimers() call can't see it in advance.
    act(() => {
      vi.runAllTimers();
    });

    // Second flush: the ai's thinking delay + its move animation + commit.
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(screen.queryByText("AI's turn")).toBeNull();

    // The player can act again — at least one of their pits is enabled.
    const playerButtonsEnabled = [7, 8, 9, 10, 11, 12, 13].some(
      (id) => !(screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
    );
    expect(playerButtonsEnabled).toBe(true);

    // Total seeds still conserved after both moves.
    const playerScore = Number(
      screen.getByText('You').nextSibling?.textContent
    );
    const aiScore = Number(screen.getByText('AI').nextSibling?.textContent);
    expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);
  });
});
