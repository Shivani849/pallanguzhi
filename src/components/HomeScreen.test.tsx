import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from './HomeScreen';

function renderHome(overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  const props = {
    hasUnfinishedGame: false,
    onSelectMode: vi.fn(),
    onContinueGame: vi.fn(),
    onHowToPlay: vi.fn(),
    onStatistics: vi.fn(),
    showWelcomePrompt: false,
    onLearnToPlay: vi.fn(),
    onDismissWelcomePrompt: vi.fn(),
    ...overrides,
  };
  render(<HomeScreen {...props} />);
  return props;
}

describe('HomeScreen', () => {
  it('renders the four main buttons and no Continue Game when there is no unfinished game', () => {
    renderHome();

    expect(screen.getByRole('button', { name: /play vs ai/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /two players/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /how to play/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /statistics/i })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /continue game/i })
    ).toBeNull();
  });

  it('shows Continue Game when an unfinished game exists', () => {
    renderHome({ hasUnfinishedGame: true });

    expect(
      screen.getByRole('button', { name: /continue game/i })
    ).toBeTruthy();
  });

  it('calls onSelectMode("vs-ai") when Play vs AI is clicked', () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /play vs ai/i }));
    expect(props.onSelectMode).toHaveBeenCalledWith('vs-ai');
  });

  it('calls onSelectMode("two-players") when Two Players is clicked', () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /two players/i }));
    expect(props.onSelectMode).toHaveBeenCalledWith('two-players');
  });

  it('calls onContinueGame when Continue Game is clicked', () => {
    const props = renderHome({ hasUnfinishedGame: true });
    fireEvent.click(screen.getByRole('button', { name: /continue game/i }));
    expect(props.onContinueGame).toHaveBeenCalledTimes(1);
  });

  it('calls onHowToPlay when How to Play is clicked', () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /how to play/i }));
    expect(props.onHowToPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onStatistics when Statistics is clicked', () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /statistics/i }));
    expect(props.onStatistics).toHaveBeenCalledTimes(1);
  });

  it('shows the welcome prompt instead of the main buttons when asked to', () => {
    renderHome({ showWelcomePrompt: true });

    expect(screen.getByText(/new to pallanguzhi/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /learn to play/i })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /play now/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^play vs ai$/i })).toBeNull();
  });

  it('calls onLearnToPlay / onDismissWelcomePrompt from the welcome prompt', () => {
    const props = renderHome({ showWelcomePrompt: true });

    fireEvent.click(screen.getByRole('button', { name: /learn to play/i }));
    expect(props.onLearnToPlay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /play now/i }));
    expect(props.onDismissWelcomePrompt).toHaveBeenCalledTimes(1);
  });
});
