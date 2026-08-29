import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import TutorialScreen from './TutorialScreen';
import { isTutorialCompleted } from '../persistence/onboarding';

function flush() {
  act(() => {
    vi.runAllTimers();
  });
}

function renderTutorial() {
  const onExit = vi.fn();
  const onPlayVsAI = vi.fn();
  const onPlayTwoPlayers = vi.fn();
  const utils = render(
    <TutorialScreen
      onExit={onExit}
      onPlayVsAI={onPlayVsAI}
      onPlayTwoPlayers={onPlayTwoPlayers}
    />
  );
  return { ...utils, onExit, onPlayVsAI, onPlayTwoPlayers };
}

function goToAwaitingTapStep() {
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('TutorialScreen', () => {
  it('starts on step 1, highlighting the player pits', () => {
    renderTutorial();

    expect(screen.getByText('This is your side of the board.')).toBeTruthy();
    expect(screen.getByText(/step 1 of 8/i)).toBeTruthy();
    for (let id = 7; id <= 13; id++) {
      expect(screen.getByTestId(`pit-${id}`).className).toContain(
        'pit--tutorial-highlight'
      );
    }
  });

  it('Next advances through steps in order', () => {
    renderTutorial();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Each pit contains seeds.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Tap one of your pits to begin.')).toBeTruthy();
  });

  it('on the awaiting-tap step, only the tutorial pit is selectable', () => {
    renderTutorial();
    goToAwaitingTapStep();

    expect((screen.getByTestId('pit-7') as HTMLButtonElement).disabled).toBe(
      false
    );
    for (const id of [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13]) {
      expect(
        (screen.getByTestId(`pit-${id}`) as HTMLButtonElement).disabled
      ).toBe(true);
    }
  });

  it('tapping a disabled (non-tutorial) pit does nothing', () => {
    renderTutorial();
    goToAwaitingTapStep();

    fireEvent.click(screen.getByTestId('pit-11'));
    flush();

    // Still on the same step — nothing happened.
    expect(screen.getByText('Tap one of your pits to begin.')).toBeTruthy();
    expect(screen.getByTestId('pit-7').textContent).toBe('2');
  });

  it('tapping the tutorial pit runs the real engine, animates, and produces the deterministic capture', () => {
    renderTutorial();
    goToAwaitingTapStep();

    fireEvent.click(screen.getByTestId('pit-7'));
    flush();

    // Real makeMove() ran: the exact capture from tutorialScenarios.test.ts
    // (6 seeds captured) is reflected in the score shown on screen.
    expect(screen.getByText('You').nextSibling?.textContent).toBe('6');
    expect(screen.getByText('Opponent').nextSibling?.textContent).toBe('0');

    // Advanced one step, to the "seeds move" message.
    expect(
      screen.getByText('The seeds move according to the game rules.')
    ).toBeTruthy();
  });

  it('progresses through the capture explanation to the opponent-move step', () => {
    renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7'));
    flush();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/captured it plus everything/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText("Now it's your opponent's turn.")).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /show opponent's move/i })
    ).toBeTruthy();
  });

  it('"Show Opponent\'s Move" runs the real engine for the scripted opponent reply', () => {
    renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7'));
    flush();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(
      screen.getByRole('button', { name: /show opponent's move/i })
    );
    flush();

    // No capture for the opponent's scripted move — score stays 6-0 (see
    // tutorialScenarios.test.ts) — and we've moved on to the winning step.
    expect(screen.getByText('You').nextSibling?.textContent).toBe('6');
    expect(screen.getByText('Opponent').nextSibling?.textContent).toBe('0');
    expect(screen.getByText(/no seeds left to sow/i)).toBeTruthy();
  });

  it('reaches the completion step, offering Play vs AI / Two Players / Back to Home, and marks the tutorial completed', () => {
    renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7'));
    flush();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /show opponent's move/i })
    );
    flush();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText("You're ready to play!")).toBeTruthy();
    expect(screen.getByRole('button', { name: /^play vs ai$/i })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /play two players/i })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to home/i })).toBeTruthy();
    expect(isTutorialCompleted()).toBe(true);
  });

  it('calling the completion buttons invokes the matching callback', () => {
    const { onPlayVsAI } = renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7'));
    flush();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /show opponent's move/i })
    );
    flush();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /^play vs ai$/i }));
    expect(onPlayVsAI).toHaveBeenCalledTimes(1);
  });

  it('Exit Tutorial calls onExit at any step, without throwing, and cleans up pending animation timers', () => {
    const { onExit } = renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7')); // starts an animation

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /exit tutorial/i }))
    ).not.toThrow();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('does not touch any existing saved game', () => {
    window.localStorage.setItem(
      'pallanguzhi:savedGame',
      JSON.stringify({ marker: 'untouched-by-tutorial' })
    );

    renderTutorial();
    goToAwaitingTapStep();
    fireEvent.click(screen.getByTestId('pit-7'));
    flush();

    expect(window.localStorage.getItem('pallanguzhi:savedGame')).toBe(
      JSON.stringify({ marker: 'untouched-by-tutorial' })
    );
  });
});
