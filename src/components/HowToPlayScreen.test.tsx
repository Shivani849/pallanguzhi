import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HowToPlayScreen from './HowToPlayScreen';

describe('HowToPlayScreen', () => {
  it('explains the board, turn, seed movement, capturing, and winning rules', () => {
    render(
      <HowToPlayScreen onStartTutorial={() => {}} onBackToHome={() => {}} />
    );

    expect(screen.getByText(/14 pits/i)).toBeTruthy();
    expect(screen.getByText(/choose one of your own pits/i)).toBeTruthy();
    expect(screen.getByText(/sown one at a time/i)).toBeTruthy();
    expect(screen.getByText(/capture both/i)).toBeTruthy();
    expect(screen.getByText(/no seeds left/i)).toBeTruthy();
    expect(screen.getByText(/equal totals end in a draw/i)).toBeTruthy();
  });

  it('does not describe an extra-turn rule the engine does not implement', () => {
    render(
      <HowToPlayScreen onStartTutorial={() => {}} onBackToHome={() => {}} />
    );

    expect(screen.queryByText(/extra turn/i)).toBeNull();
    expect(screen.queryByText(/go again/i)).toBeNull();
  });

  it('calls onStartTutorial when Start Interactive Tutorial is clicked', () => {
    const onStartTutorial = vi.fn();
    render(
      <HowToPlayScreen
        onStartTutorial={onStartTutorial}
        onBackToHome={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /start interactive tutorial/i })
    );
    expect(onStartTutorial).toHaveBeenCalledTimes(1);
  });

  it('calls onBackToHome when Back to Home is clicked', () => {
    const onBackToHome = vi.fn();
    render(
      <HowToPlayScreen onStartTutorial={() => {}} onBackToHome={onBackToHome} />
    );

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(onBackToHome).toHaveBeenCalledTimes(1);
  });
});
