import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PassDeviceScreen from './PassDeviceScreen';

describe('PassDeviceScreen', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <PassDeviceScreen
        visible={false}
        completedPlayerLabel="Player 1"
        nextPlayerLabel="Player 2"
        onContinue={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows who just finished and who to pass the device to', () => {
    render(
      <PassDeviceScreen
        visible
        completedPlayerLabel="Player 1"
        nextPlayerLabel="Player 2"
        onContinue={() => {}}
      />
    );

    expect(screen.getByText(/Player 1.*Turn Complete/)).toBeTruthy();
    expect(screen.getByText(/Pass the device to Player 2/)).toBeTruthy();
  });

  it('calls onContinue when the Continue button is clicked', () => {
    const onContinue = vi.fn();
    render(
      <PassDeviceScreen
        visible
        completedPlayerLabel="Player 2"
        nextPlayerLabel="Player 1"
        onContinue={onContinue}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
