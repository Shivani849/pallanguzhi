import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { STARTING_SEEDS_PER_PIT } from './game/gameState';

const TOTAL_SEEDS = STARTING_SEEDS_PER_PIT * 14;

function totalSeedsOnBoard(): number {
  return screen
    .getAllByRole('button')
    .reduce((sum, button) => sum + Number(button.textContent), 0);
}

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
      expect((screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled).toBe(
        true
      );
    }
    for (let id = 7; id <= 13; id++) {
      expect((screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled).toBe(
        false
      );
    }
  });

  it('clicking an invalid (ai) pit does nothing while it is the player\'s turn', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-0')); // an ai pit, disabled

    // still the player's turn, board unchanged
    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
  });

  it('clicking a valid player pit distributes seeds, updates the board, and switches the turn', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('pit-7'));

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

    // Turn has switched away from the player (no AI implemented yet, so
    // it simply now shows the ai's turn without anything acting on it).
    expect(screen.queryByText('Your turn')).toBeNull();
    expect(screen.getByText("AI's turn")).toBeTruthy();

    // No pit should be clickable now, since it isn't the player's turn.
    for (const button of screen.getAllByRole('button') as HTMLButtonElement[]) {
      expect(button.disabled).toBe(true);
    }
  });
});
