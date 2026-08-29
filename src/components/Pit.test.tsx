import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pit from './Pit';

const samplePit = { id: 7, owner: 'player' as const, index: 0, seeds: 4 };

describe('Pit', () => {
  it('displays the seed count', () => {
    render(<Pit pit={samplePit} selectable={false} />);
    expect(screen.getByTestId('pit-7').textContent).toBe('4');
  });

  it('calls onSelect with the pit id when selectable and clicked', () => {
    const onSelect = vi.fn();
    render(<Pit pit={samplePit} selectable onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('pit-7'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('is rendered as a disabled button and ignores clicks when not selectable', () => {
    const onSelect = vi.fn();
    render(<Pit pit={samplePit} selectable={false} onSelect={onSelect} />);

    const button = screen.getByTestId('pit-7') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
