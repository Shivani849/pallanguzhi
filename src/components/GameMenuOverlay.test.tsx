import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameMenuOverlay from './GameMenuOverlay';

function noop() {}

describe('GameMenuOverlay', () => {
  it('renders nothing when view is "closed"', () => {
    const { container } = render(
      <GameMenuOverlay
        view="closed"
        onResume={noop}
        onRequestRestart={noop}
        onCancelRestart={noop}
        onConfirmRestart={noop}
        onRequestBackToHome={noop}
        onCancelLeave={noop}
        onConfirmSaveAndGoHome={noop}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('the "menu" view shows Resume, Restart, and Back to Home', () => {
    const onResume = vi.fn();
    const onRequestRestart = vi.fn();
    const onRequestBackToHome = vi.fn();
    render(
      <GameMenuOverlay
        view="menu"
        onResume={onResume}
        onRequestRestart={onRequestRestart}
        onCancelRestart={noop}
        onConfirmRestart={noop}
        onRequestBackToHome={onRequestBackToHome}
        onCancelLeave={noop}
        onConfirmSaveAndGoHome={noop}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /restart game/i }));
    expect(onRequestRestart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(onRequestBackToHome).toHaveBeenCalledTimes(1);
  });

  it('the "confirm-restart" view warns about lost progress and wires Cancel/Restart', () => {
    const onCancelRestart = vi.fn();
    const onConfirmRestart = vi.fn();
    render(
      <GameMenuOverlay
        view="confirm-restart"
        onResume={noop}
        onRequestRestart={noop}
        onCancelRestart={onCancelRestart}
        onConfirmRestart={onConfirmRestart}
        onRequestBackToHome={noop}
        onCancelLeave={noop}
        onConfirmSaveAndGoHome={noop}
      />
    );

    expect(screen.getByText(/restart this game\?/i)).toBeTruthy();
    expect(screen.getByText(/progress will be lost/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancelRestart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /restart game/i }));
    expect(onConfirmRestart).toHaveBeenCalledTimes(1);
  });

  it('the "confirm-leave" view mentions saving locally and wires Continue Playing/Save & Go Home', () => {
    const onCancelLeave = vi.fn();
    const onConfirmSaveAndGoHome = vi.fn();
    render(
      <GameMenuOverlay
        view="confirm-leave"
        onResume={noop}
        onRequestRestart={noop}
        onCancelRestart={noop}
        onConfirmRestart={noop}
        onRequestBackToHome={noop}
        onCancelLeave={onCancelLeave}
        onConfirmSaveAndGoHome={onConfirmSaveAndGoHome}
      />
    );

    expect(screen.getByText(/leave current game\?/i)).toBeTruthy();
    expect(screen.getByText(/saved locally/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /continue playing/i }));
    expect(onCancelLeave).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: /save & go home/i })
    );
    expect(onConfirmSaveAndGoHome).toHaveBeenCalledTimes(1);
  });
});
