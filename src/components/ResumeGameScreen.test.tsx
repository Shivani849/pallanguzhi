import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeGameScreen from './ResumeGameScreen';

describe('ResumeGameScreen', () => {
  it('renders both buttons and the unfinished-game message', () => {
    render(<ResumeGameScreen onContinue={() => {}} onNewGame={() => {}} />);

    expect(screen.getByText(/unfinished game/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /continue game/i })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /new game/i })).toBeTruthy();
  });

  it('calls onContinue when Continue Game is clicked', () => {
    const onContinue = vi.fn();
    render(<ResumeGameScreen onContinue={onContinue} onNewGame={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /continue game/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onNewGame when New Game is clicked', () => {
    const onNewGame = vi.fn();
    render(<ResumeGameScreen onContinue={() => {}} onNewGame={onNewGame} />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
