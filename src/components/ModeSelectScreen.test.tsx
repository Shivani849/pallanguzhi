import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelectScreen from './ModeSelectScreen';

describe('ModeSelectScreen', () => {
  it('renders both mode buttons', () => {
    render(<ModeSelectScreen onSelectMode={() => {}} />);

    expect(screen.getByRole('button', { name: /play vs ai/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /two players/i })).toBeTruthy();
  });

  it('calls onSelectMode("vs-ai") when Play vs AI is clicked', () => {
    const onSelectMode = vi.fn();
    render(<ModeSelectScreen onSelectMode={onSelectMode} />);

    fireEvent.click(screen.getByRole('button', { name: /play vs ai/i }));

    expect(onSelectMode).toHaveBeenCalledWith('vs-ai');
  });

  it('calls onSelectMode("two-players") when Two Players is clicked', () => {
    const onSelectMode = vi.fn();
    render(<ModeSelectScreen onSelectMode={onSelectMode} />);

    fireEvent.click(screen.getByRole('button', { name: /two players/i }));

    expect(onSelectMode).toHaveBeenCalledWith('two-players');
  });
});
