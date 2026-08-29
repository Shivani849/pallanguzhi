import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { STARTING_SEEDS_PER_PIT } from './game/gameState';
import { isFeedbackEnabled, setFeedbackEnabled } from './audio/soundManager';
import { loadSavedGame } from './persistence/gameSave';
import { loadHistory } from './persistence/gameHistory';

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

// The first-ever Home render shows a one-time welcome prompt (see
// persistence/onboarding.ts) that hides the main buttons — dismiss it
// with "Play Now" so tests that just want a board can get straight there,
// the same as before that prompt existed.
function dismissWelcomePromptIfPresent() {
  const playNow = screen.queryByRole('button', { name: /play now/i });
  if (playNow) fireEvent.click(playNow);
}

// Home is the entry screen — most existing tests just want straight to a
// vs-ai board, same as before Home existed.
function renderVsAI() {
  const utils = render(<App />);
  dismissWelcomePromptIfPresent();
  fireEvent.click(screen.getByRole('button', { name: /play vs ai/i }));
  return utils;
}

function renderTwoPlayers() {
  const utils = render(<App />);
  dismissWelcomePromptIfPresent();
  fireEvent.click(screen.getByRole('button', { name: /two players/i }));
  return utils;
}

beforeEach(() => {
  vi.useFakeTimers();
  setFeedbackEnabled(true);
  // Every test starts with no saved game / no history, unless it sets
  // one up itself — otherwise a leftover save from one test would show
  // the resume-prompt screen in the next.
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
  setFeedbackEnabled(true);
});

describe('App', () => {
  it('shows the initial board with 0-0 score and the player to move', () => {
    renderVsAI();

    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(pitButtons()).toHaveLength(14);
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
  });

  it('only enables the player pits at the start (not the ai pits)', () => {
    renderVsAI();

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
    renderVsAI();

    fireEvent.click(screen.getByTestId('pit-0')); // an ai pit, disabled

    // still the player's turn, board unchanged
    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
  });

  it('disables every pit immediately while the move animation is in progress', () => {
    renderVsAI();

    fireEvent.click(screen.getByTestId('pit-7'));

    // Animation is running (timers haven't been flushed yet) — nothing
    // should be clickable, and the committed game state hasn't changed.
    for (const button of pitButtons()) {
      expect(button.disabled).toBe(true);
    }
    expect(screen.getByText('Your turn')).toBeTruthy();
  });

  it('animates seed distribution, then shows the final state and switches the turn', () => {
    renderVsAI();

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
    renderVsAI();

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
    renderVsAI();
    expect(screen.queryByTestId('game-over-overlay')).toBeNull();
  });

  it('the sound toggle reflects and updates the shared audio preference', () => {
    renderVsAI();

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
    renderVsAI();

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
      renderVsAI();
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
      renderVsAI();

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
      renderVsAI();

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
      const { unmount } = renderVsAI();

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

  describe('home screen', () => {
    it('shows the Home screen first (behind the one-time welcome prompt), with no board', () => {
      render(<App />);

      expect(screen.getByText(/new to pallanguzhi/i)).toBeTruthy();
      expect(screen.queryByTestId('pit-0')).toBeNull();

      dismissWelcomePromptIfPresent();

      expect(
        screen.getByRole('button', { name: /play vs ai/i })
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /two players/i })
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /how to play/i })
      ).toBeTruthy();
      expect(screen.queryByTestId('pit-0')).toBeNull();
    });

    it('does not show Continue Game when there is no unfinished game', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();

      expect(
        screen.queryByRole('button', { name: /continue game/i })
      ).toBeNull();
    });

    it('choosing "Play vs AI" starts a fresh vs-ai game', () => {
      renderVsAI();

      expect(screen.getByText('Your turn')).toBeTruthy();
      expect(screen.getByText('AI')).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    });

    it('choosing "Two Players" starts a fresh two-player game', () => {
      renderTwoPlayers();

      expect(screen.getByText("Player 1's turn")).toBeTruthy();
      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 2')).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    });
  });

  describe('two-players mode', () => {
    it('only enables the current player\'s own pits, never the other player\'s', () => {
      renderTwoPlayers();

      // Player 1 (owner 'player', ids 7-13) moves first.
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

    it('shows the pass-device screen after a move, blocking the board until Continue is tapped', () => {
      renderTwoPlayers();

      fireEvent.click(screen.getByTestId('pit-7'));
      act(() => {
        vi.runAllTimers();
      });

      // The move committed (turn switched to Player 2), but the
      // pass-device screen should be up, blocking every pit.
      expect(screen.getByTestId('pass-device-overlay')).toBeTruthy();
      expect(screen.getByText(/Player 1.*Turn Complete/)).toBeTruthy();
      expect(screen.getByText(/Pass the device to Player 2/)).toBeTruthy();
      for (const button of pitButtons()) {
        expect(button.disabled).toBe(true);
      }

      // Tapping Continue reveals the board for Player 2 — and no AI ever
      // fires on its own in this mode.
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.queryByTestId('pass-device-overlay')).toBeNull();
      expect(screen.getByText("Player 2's turn")).toBeTruthy();
      // At least one of Player 2's own pits is selectable (some may
      // legitimately be empty after the relay chain and stay disabled
      // regardless of whose turn it is — same as in vs-ai mode).
      const player2HasAMove = [0, 1, 2, 3, 4, 5, 6].some(
        (id) => !(screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      );
      expect(player2HasAMove).toBe(true);
      // None of Player 1's own pits are selectable — it isn't their turn.
      for (let id = 7; id <= 13; id++) {
        expect(
          (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
        ).toBe(true);
      }

      // Confirm nothing auto-plays: flushing timers changes nothing.
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByText("Player 2's turn")).toBeTruthy();
    });

    it('plays a full player 1 -> pass -> player 2 -> pass cycle correctly', () => {
      renderTwoPlayers();

      fireEvent.click(screen.getByTestId('pit-7'));
      act(() => {
        vi.runAllTimers();
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Now Player 2's turn — find one of their enabled pits (ids 0-6)
      // and play it.
      const player2Pit = [0, 1, 2, 3, 4, 5, 6]
        .map((id) => screen.getByTestId(`pit-${id}`) as HTMLButtonElement)
        .find((button) => !button.disabled);
      expect(player2Pit).toBeTruthy();

      fireEvent.click(player2Pit!);
      act(() => {
        vi.runAllTimers();
      });

      expect(screen.getByTestId('pass-device-overlay')).toBeTruthy();
      expect(screen.getByText(/Player 2.*Turn Complete/)).toBeTruthy();
      expect(screen.getByText(/Pass the device to Player 1/)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(screen.getByText("Player 1's turn")).toBeTruthy();

      const playerScore = Number(
        screen.getByText('Player 1').nextSibling?.textContent
      );
      const aiScore = Number(
        screen.getByText('Player 2').nextSibling?.textContent
      );
      expect(totalSeedsOnBoard() + playerScore + aiScore).toBe(TOTAL_SEEDS);
    });

    it('plays a full two-player game to completion and Play Again stays in two-players mode', () => {
      renderTwoPlayers();

      const isGameOver = () =>
        screen.queryByTestId('game-over-overlay') !== null;

      let iterations = 0;
      const MAX_ITERATIONS = 1000;

      while (!isGameOver() && iterations < MAX_ITERATIONS) {
        const passOverlay = screen.queryByTestId('pass-device-overlay');
        if (passOverlay) {
          fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        }

        const enabledPit = [...Array(14).keys()]
          .map((id) => screen.getByTestId(`pit-${id}`) as HTMLButtonElement)
          .find((button) => !button.disabled);

        if (enabledPit) {
          fireEvent.click(enabledPit);
        }

        act(() => {
          vi.runAllTimers();
        });
        iterations++;
      }

      expect(isGameOver()).toBe(true);

      const overlay = screen.getByTestId('game-over-overlay');
      const resultTitle =
        overlay.querySelector('.game-over-title')?.textContent;
      expect(['Player 1 Wins!', 'Player 2 Wins!', 'Draw']).toContain(
        resultTitle
      );

      // Play Again resets the board but stays in two-players mode — no
      // return to the mode-select screen, and labels are still Player 1/2.
      fireEvent.click(screen.getByRole('button', { name: /play again/i }));

      expect(screen.queryByTestId('game-over-overlay')).toBeNull();
      expect(screen.getByText("Player 1's turn")).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
      expect(
        screen.queryByRole('button', { name: /two players/i })
      ).toBeNull();
    });
  });

  describe('offline persistence', () => {
    it('shows no Continue Game button on a fresh start (nothing saved yet)', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();
      expect(
        screen.queryByRole('button', { name: /continue game/i })
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: /play vs ai/i })
      ).toBeTruthy();
    });

    it('saves the game after a completed turn, and restores it exactly on a fresh mount', () => {
      const first = renderVsAI();
      fireEvent.click(screen.getByTestId('pit-7'));
      // A single flush lands right after the player's move commits (turn
      // switches to the ai, whose own timer hasn't fired yet) — see the
      // "animates seed distribution..." test above for why one flush
      // stops exactly there.
      act(() => {
        vi.runAllTimers();
      });

      const saved = loadSavedGame();
      expect(saved).not.toBeNull();
      expect(saved?.mode).toBe('vs-ai');
      expect(saved?.gameState.status).toBe('in-progress');
      expect(saved?.moveCount).toBe(1);

      const boardBeforeRemount = pitButtons().map((b) => b.textContent);
      first.unmount();

      // Simulate a fresh app start (e.g. the page being reloaded) by
      // rendering an entirely new instance. The welcome prompt doesn't
      // reappear (it was already marked seen by the first mount above),
      // so Home's Continue Game button is immediately visible.
      render(<App />);
      expect(
        screen.getByRole('button', { name: /continue game/i })
      ).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /continue game/i }));

      expect(screen.getByText("AI's turn")).toBeTruthy();
      expect(pitButtons().map((b) => b.textContent)).toEqual(
        boardBeforeRemount
      );
    });

    it('starting a fresh mode from Home discards an old unfinished save', () => {
      const first = renderVsAI();
      fireEvent.click(screen.getByTestId('pit-7'));
      act(() => {
        vi.runAllTimers();
      });
      expect(loadSavedGame()).not.toBeNull();
      first.unmount();

      render(<App />);
      expect(
        screen.getByRole('button', { name: /continue game/i })
      ).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /play vs ai/i }));

      expect(loadSavedGame()).toBeNull();
      expect(screen.getByText('Your turn')).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    });

    it('clears the save and records a history entry once a game finishes', () => {
      renderVsAI();

      const isGameOver = () =>
        screen.queryByTestId('game-over-overlay') !== null;
      let iterations = 0;

      while (!isGameOver() && iterations < 1000) {
        const enabledPit = pitButtons().find((b) => !b.disabled);
        if (enabledPit) fireEvent.click(enabledPit);
        flushAllTimersTwice();
        iterations++;
      }

      expect(isGameOver()).toBe(true);
      expect(loadSavedGame()).toBeNull();

      const history = loadHistory();
      expect(history).toHaveLength(1);
      expect(history[0].mode).toBe('vs-ai');
      expect(['player', 'ai', 'draw']).toContain(history[0].winner);
      expect(history[0].moveCount).toBeGreaterThan(0);
      expect(history[0].playerScore + history[0].aiScore).toBeGreaterThan(0);
    });

    it('shows recorded games in the History screen', () => {
      renderVsAI();
      fireEvent.click(screen.getByTestId('pit-7'));
      flushAllTimersTwice();

      // Nothing in history yet (game still in progress).
      fireEvent.click(screen.getByRole('button', { name: /history/i }));
      expect(screen.getByText(/no games played yet/i)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      // Finish the game, then check history shows it.
      const isGameOver = () =>
        screen.queryByTestId('game-over-overlay') !== null;
      let iterations = 0;
      while (!isGameOver() && iterations < 1000) {
        const enabledPit = pitButtons().find((b) => !b.disabled);
        if (enabledPit) fireEvent.click(enabledPit);
        flushAllTimersTwice();
        iterations++;
      }

      fireEvent.click(screen.getByRole('button', { name: /history/i }));
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });

  describe('statistics screen', () => {
    it('shows all-zero stats with no history', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /statistics/i }));

      expect(screen.getByRole('heading', { name: 'vs AI' })).toBeTruthy();
      expect(
        screen.getByRole('heading', { name: 'Two Players' })
      ).toBeTruthy();
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('reflects a completed vs-ai game in the vs-ai stats', () => {
      renderVsAI();

      const isGameOver = () =>
        screen.queryByTestId('game-over-overlay') !== null;
      let iterations = 0;
      while (!isGameOver() && iterations < 1000) {
        const enabledPit = pitButtons().find((b) => !b.disabled);
        if (enabledPit) fireEvent.click(enabledPit);
        flushAllTimersTwice();
        iterations++;
      }
      expect(isGameOver()).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /statistics/i }));

      const values = screen
        .getAllByRole('definition')
        .map((el) => el.textContent);
      // Exactly one vs-ai game played, so "games played" (1) must appear.
      expect(values).toContain('1');
    });

    it('closes when Close is clicked', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /statistics/i }));
      expect(screen.getByTestId('statistics-overlay')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByTestId('statistics-overlay')).toBeNull();
    });
  });

  describe('game menu', () => {
    function openMenu() {
      fireEvent.click(screen.getByRole('button', { name: /open game menu/i }));
    }

    it('shows a pause/menu icon during an in-progress game', () => {
      renderVsAI();
      expect(
        screen.getByRole('button', { name: /open game menu/i })
      ).toBeTruthy();
    });

    it('Resume closes the menu without changing anything', () => {
      renderVsAI();
      openMenu();
      expect(screen.getByTestId('game-menu-overlay')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /^resume$/i }));

      expect(screen.queryByTestId('game-menu-overlay')).toBeNull();
      expect(screen.getByText('Your turn')).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    });

    describe('restart', () => {
      it('shows a confirmation, and Cancel leaves the game unchanged', () => {
        renderVsAI();
        fireEvent.click(screen.getByTestId('pit-7'));
        act(() => {
          vi.runAllTimers();
        }); // one flush: now the AI's turn, its own timer still pending

        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /restart game/i }));
        expect(screen.getByText(/restart this game\?/i)).toBeTruthy();
        expect(screen.getByText(/progress will be lost/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

        // Cancel returns to the game menu itself (not fully closed), and
        // the game is exactly as it was — still the ai's turn, not reset.
        expect(screen.getByText('Game Menu')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^resume$/i }));
        expect(screen.queryByTestId('game-menu-overlay')).toBeNull();
        expect(screen.getByText("AI's turn")).toBeTruthy();
      });

      it('Restart Game resets the board, scores, and turn completely, with no stale animation state, and clears the old save', () => {
        renderVsAI();
        fireEvent.click(screen.getByTestId('pit-7'));
        act(() => {
          vi.runAllTimers();
        });
        expect(loadSavedGame()).not.toBeNull();

        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /restart game/i }));
        fireEvent.click(screen.getByRole('button', { name: /restart game/i })); // confirm

        expect(screen.queryByTestId('game-menu-overlay')).toBeNull();
        expect(screen.getByText('Your turn')).toBeTruthy();
        expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
        expect(Number(screen.getByText('You').nextSibling?.textContent)).toBe(
          0
        );
        expect(Number(screen.getByText('AI').nextSibling?.textContent)).toBe(
          0
        );
        for (const button of pitButtons()) {
          expect(button.className).not.toContain('pit--active');
          expect(button.className).not.toContain('pit--landing');
        }
        expect(loadSavedGame()).toBeNull();

        // Nothing further happens even after flushing timers again — no
        // dangling animation/AI timer survived the restart.
        act(() => {
          vi.runAllTimers();
        });
        expect(screen.getByText('Your turn')).toBeTruthy();
      });

      it('restarting mid-animation does not throw and leaves no stale animation state', () => {
        renderVsAI();
        fireEvent.click(screen.getByTestId('pit-7')); // animation in flight

        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /restart game/i }));

        expect(() =>
          fireEvent.click(
            screen.getByRole('button', { name: /restart game/i })
          )
        ).not.toThrow();

        expect(screen.getByText('Your turn')).toBeTruthy();
        expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
        for (const button of pitButtons()) {
          expect(button.className).not.toContain('pit--active');
        }

        // Any timers left over from the abandoned animation are inert.
        expect(() => {
          act(() => {
            vi.runAllTimers();
          });
        }).not.toThrow();
      });
    });

    describe('back to home', () => {
      it('an unfinished game shows a confirmation before leaving', () => {
        renderVsAI();
        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /back to home/i }));

        expect(screen.getByText(/leave current game\?/i)).toBeTruthy();
        expect(screen.getByText(/saved locally/i)).toBeTruthy();
        expect(
          screen.getByRole('button', { name: /continue playing/i })
        ).toBeTruthy();
        expect(
          screen.getByRole('button', { name: /save & go home/i })
        ).toBeTruthy();
      });

      it('"Continue Playing" cancels and returns to the game, unchanged', () => {
        renderVsAI();
        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /back to home/i }));

        fireEvent.click(
          screen.getByRole('button', { name: /continue playing/i })
        );

        // Returns to the game menu itself (not fully closed) — the game
        // underneath is untouched.
        expect(screen.getByText('Game Menu')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^resume$/i }));
        expect(screen.queryByTestId('game-menu-overlay')).toBeNull();
        expect(screen.getByText('Your turn')).toBeTruthy();
        expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
      });

      it('"Save & Go Home" saves the game and returns to Home, and Continue Game restores the exact board and turn', () => {
        renderVsAI();
        fireEvent.click(screen.getByTestId('pit-7'));
        act(() => {
          vi.runAllTimers();
        }); // move committed, now the ai's turn
        const boardBeforeLeaving = pitButtons().map((b) => b.textContent);

        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
        fireEvent.click(
          screen.getByRole('button', { name: /save & go home/i })
        );

        // Back on Home, no board showing.
        expect(screen.queryByTestId('pit-0')).toBeNull();
        expect(
          screen.getByRole('button', { name: /continue game/i })
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /continue game/i }));

        expect(screen.getByText("AI's turn")).toBeTruthy();
        expect(pitButtons().map((b) => b.textContent)).toEqual(
          boardBeforeLeaving
        );

        // Nothing kept playing in the background while on Home — the ai's
        // pending "thinking" timer was cancelled, not just hidden.
      });

      it('does not let the ai keep playing in the background after leaving to Home', () => {
        renderVsAI();
        fireEvent.click(screen.getByTestId('pit-7'));
        act(() => {
          vi.runAllTimers();
        }); // now the ai's turn, its thinking timer is pending

        openMenu();
        fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
        fireEvent.click(
          screen.getByRole('button', { name: /save & go home/i })
        );

        const savedBefore = loadSavedGame();

        // If the ai's pending move weren't cancelled, flushing timers now
        // would let it play and re-save a different (further-advanced)
        // state while the user is on Home.
        act(() => {
          vi.runAllTimers();
        });

        expect(loadSavedGame()).toEqual(savedBefore);
      });

      it('a finished game returns to Home directly, with no confirmation', () => {
        renderVsAI();

        const isGameOver = () =>
          screen.queryByTestId('game-over-overlay') !== null;
        let iterations = 0;
        while (!isGameOver() && iterations < 1000) {
          const enabledPit = pitButtons().find((b) => !b.disabled);
          if (enabledPit) fireEvent.click(enabledPit);
          flushAllTimersTwice();
          iterations++;
        }
        expect(isGameOver()).toBe(true);

        // No pause/menu icon once the game has ended.
        expect(
          screen.queryByRole('button', { name: /open game menu/i })
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /back to home/i }));

        expect(screen.queryByTestId('game-over-overlay')).toBeNull();
        expect(
          screen.getByRole('button', { name: /play vs ai/i })
        ).toBeTruthy();
        expect(screen.queryByText(/leave current game\?/i)).toBeNull();
      });
    });
  });

  describe('how to play navigation', () => {
    it('How to Play opens the rules screen from Home, and Back to Home returns', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();

      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
      expect(screen.getByText(/14 pits/i)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
      expect(
        screen.getByRole('button', { name: /play vs ai/i })
      ).toBeTruthy();
    });

    it('Start Interactive Tutorial opens the tutorial', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();
      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));

      fireEvent.click(
        screen.getByRole('button', { name: /start interactive tutorial/i })
      );

      expect(screen.getByText('This is your side of the board.')).toBeTruthy();
    });
  });

  describe('tutorial navigation', () => {
    it('"Learn to Play" from the first-time welcome prompt goes straight into the tutorial', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /learn to play/i }));

      expect(screen.getByText('This is your side of the board.')).toBeTruthy();
    });

    it('exiting the tutorial returns to Home without touching an existing unfinished save', () => {
      const first = renderVsAI();
      fireEvent.click(screen.getByTestId('pit-7'));
      act(() => {
        vi.runAllTimers();
      });
      const savedBefore = loadSavedGame();
      first.unmount();

      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /start interactive tutorial/i })
      );

      expect(() =>
        fireEvent.click(
          screen.getByRole('button', { name: /exit tutorial/i })
        )
      ).not.toThrow();

      expect(
        screen.getByRole('button', { name: /continue game/i })
      ).toBeTruthy();
      expect(loadSavedGame()).toEqual(savedBefore);
    });

    it('completing the tutorial and choosing Play vs AI starts a real game', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();
      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /start interactive tutorial/i })
      );

      // Walk through every step to reach completion.
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByTestId('pit-7'));
      act(() => {
        vi.runAllTimers();
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /show opponent's move/i })
      );
      act(() => {
        vi.runAllTimers();
      });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText("You're ready to play!")).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /^play vs ai$/i }));

      // A real, fresh vs-ai game — not the tutorial's scripted board.
      expect(screen.getByText('Your turn')).toBeTruthy();
      expect(totalSeedsOnBoard()).toBe(TOTAL_SEEDS);
    });

    it('the tutorial can be replayed from How to Play after finishing it once', () => {
      render(<App />);
      dismissWelcomePromptIfPresent();
      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /start interactive tutorial/i })
      );
      fireEvent.click(screen.getByRole('button', { name: /exit tutorial/i }));

      // Replay it — How to Play never gates on completion.
      fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /start interactive tutorial/i })
      );

      expect(screen.getByText('This is your side of the board.')).toBeTruthy();
    });
  });
});
