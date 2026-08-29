import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { STARTING_SEEDS_PER_PIT } from './game/gameState';
import { isFeedbackEnabled, setFeedbackEnabled } from './audio/soundManager';

const TOTAL_SEEDS = STARTING_SEEDS_PER_PIT * 14;

function pitButtons(): HTMLButtonElement[] {
  return [...Array(14).keys()].map(
    (id) => screen.getByTestId(`pit-${id}`) as HTMLButtonElement
  );
}

function totalSeedsOnBoard(): number {
  return pitButtons().reduce(
    (sum, button) => sum + Number(button.textContent),
    0
  );
}

// Flushes twice: a move's own animation timers might, on commit, cause a
// dependent effect (the ai's "thinking" timer) to schedule a *new* timer
// that didn't exist in the fake-timer queue until this act() call was
// already underway — a single runAllTimers() can't see it in advance.
function flushAllTimersTwice() {
  act(() => {
    vi.runAllTimers();
  });
  act(() => {
    vi.runAllTimers();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setFeedbackEnabled(true);
});

afterEach(() => {
  vi.useRealTimers();
  setFeedbackEnabled(true);
});

describe('App', () => {
  it('shows the initial board with 0-0 score and the player to move', () => {
    render(<App />);

    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(pitButtons()).toHaveLength(14);
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
    for (const button of pitButtons()) {
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
    for (const button of pitButtons()) {
      expect(button.disabled).toBe(true);
    }

    // Animation highlight classes are gone once a move has fully committed.
    for (const button of pitButtons()) {
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

  it('does not show the game-over overlay while the game is in progress', () => {
    render(<App />);
    expect(screen.queryByTestId('game-over-overlay')).toBeNull();
  });

  it('the sound toggle reflects and updates the shared audio preference', () => {
    render(<App />);

    const toggle = screen.getByRole('button', { name: /mute sound/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(isFeedbackEnabled()).toBe(true);

    fireEvent.click(toggle);

    expect(isFeedbackEnabled()).toBe(false);
    expect(
      screen.getByRole('button', { name: /unmute sound/i }).getAttribute(
        'aria-pressed'
      )
    ).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /unmute sound/i }));

    expect(isFeedbackEnabled()).toBe(true);
    expect(screen.getByRole('button', { name: /mute sound/i })).toBeTruthy();
  });

  it('plays a full game to completion, shows the result overlay with correct scores, and Play Again fully resets the game', () => {
    render(<App />);

    const flush = () =>
      act(() => {
        vi.runAllTimers();
      });

    const isGameOver = () => screen.queryByTestId('game-over-overlay') !== null;

    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (!isGameOver() && iterations < MAX_ITERATIONS) {
      const enabledPlayerPit = [7, 8, 9, 10, 11, 12, 13]
        .map((id) => screen.getByTestId(`pit-${id}`) as HTMLButtonElement)
        .find((button) => !button.disabled);

      if (enabledPlayerPit) {
        fireEvent.click(enabledPlayerPit);
      }

      // Flush twice: once for the move just clicked (or the ai's move
      // already in flight), once more in case that commit just scheduled
      // the ai's own "thinking" timer (see the turn-cycle test above).
      flush();
      flush();
      iterations++;
    }

    expect(isGameOver()).toBe(true);

    const overlay = screen.getByTestId('game-over-overlay');
    const resultTitle = overlay.querySelector('.game-over-title')?.textContent;
    expect(['You Win!', 'You Lose', 'Draw']).toContain(resultTitle);

    // The overlay's scores match the board's committed collected totals,
    // and everything still adds up to the full seed count.
    const overlayScores = Array.from(
      overlay.querySelectorAll('.score-value')
    ).map((el) => Number(el.textContent));
    const [overlayAiScore, overlayPlayerScore] = overlayScores;
    expect(totalSeedsOnBoard() + overlayPlayerScore + overlayAiScore).toBe(
      TOTAL_SEEDS
    );

    // No pit should be clickable once the game is over.
    for (let id = 0; id < 14; id++) {
      expect(
        (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      ).toBe(true);
    }

    // Play Again resets everything back to the initial state.
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));

    expect(screen.queryByTestId('game-over-overlay')).toBeNull();
    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    expect(Number(screen.getByText('You').nextSibling?.textContent)).toBe(0);
    expect(Number(screen.getByText('AI').nextSibling?.textContent)).toBe(0);
    for (let id = 7; id <= 13; id++) {
      expect(
        (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      ).toBe(false);
    }

    // No leftover animation state either: nothing further happens even
    // after flushing timers again.
    flush();
    expect(screen.getByText('Your turn')).toBeTruthy();
  });

  describe('QA: race conditions / double-clicks / rapid taps', () => {
    it('rapid double-click on the same pit only applies the move once', () => {
      render(<App />);
      const pit = screen.getByTestId('pit-7');

      // Two clicks fired back-to-back, before any timer/render flush —
      // the second must be a no-op since the button becomes disabled
      // synchronously as part of handling the first.
      fireEvent.click(pit);
      fireEvent.click(pit);

      flushAllTimersTwice();

      // If the move had been double-applied, the total captured seeds
      // would exceed what a single move from a fresh board can produce,
      // and/or the board would show impossible negative-consumption
      // artifacts. The one invariant that must always hold regardless of
      // how many times a move was (mistakenly) applied is conservation:
      const playerScore = Number(
        screen.getByText('You').nextSibling?.textContent
      );
      const aiScore = Number(screen.getByText('AI').nextSibling?.textContent);
      expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);

      // More precisely: exactly one player move followed by exactly one
      // ai response switches the turn back to the player. If the second
      // click had also gone through as a *second* player move, the turn
      // would still show "AI's turn" (two player moves with no ai move
      // in between never happens — turn strictly alternates) or the game
      // would be further along than a single round-trip allows.
      expect(screen.getByText('Your turn')).toBeTruthy();
    });

    it('rapid clicks across multiple different pits only apply the first', () => {
      render(<App />);

      // Fire clicks on several different player pits synchronously, as
      // fast as possible, with no flush in between.
      fireEvent.click(screen.getByTestId('pit-7'));
      fireEvent.click(screen.getByTestId('pit-8'));
      fireEvent.click(screen.getByTestId('pit-9'));
      fireEvent.click(screen.getByTestId('pit-10'));

      flushAllTimersTwice();

      const playerScore = Number(
        screen.getByText('You').nextSibling?.textContent
      );
      const aiScore = Number(screen.getByText('AI').nextSibling?.textContent);
      expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);
      // Exactly one player+ai round-trip happened, same reasoning as above.
      expect(screen.getByText('Your turn')).toBeTruthy();
    });

    it('clicking mid-animation (after timers have partially advanced) does nothing', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('pit-7'));

      // Advance partway through the animation, then try to click again —
      // every pit should still be disabled at this point.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      for (const button of pitButtons()) {
        fireEvent.click(button);
      }

      flushAllTimersTwice();

      const playerScore = Number(
        screen.getByText('You').nextSibling?.textContent
      );
      const aiScore = Number(screen.getByText('AI').nextSibling?.textContent);
      expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);
      expect(screen.getByText('Your turn')).toBeTruthy();
    });

    it('unmounting mid-animation does not throw or leave dangling timers that crash later', () => {
      const { unmount } = render(<App />);

      fireEvent.click(screen.getByTestId('pit-7'));
      // Unmount while frame timers and the finish timeout are still
      // pending in the queue.
      expect(() => unmount()).not.toThrow();

      // Any timers that were scheduled before unmount are still in
      // vitest's fake-timer queue (React unmounting a component doesn't
      // reach into an external timer queue to cancel entries by itself —
      // that's exactly why App's own cleanup effect calls clearTimeout on
      // all of them). Running them now, after unmount, must not throw
      // (i.e. the cleanup effect really did cancel them).
      expect(() => {
        act(() => {
          vi.runAllTimers();
        });
      }).not.toThrow();
    });
  });
});
