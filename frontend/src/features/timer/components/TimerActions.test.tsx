import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import TimerActions from './TimerActions';

const makeCallbacks = () => ({
  isPausingTimer: false,
  isResumingTimer: false,
  isStartingTimer: false,
  isStoppingTimer: false,
  onPauseTimer: vi.fn(),
  onResumeTimer: vi.fn(),
  onStartTimer: vi.fn(),
  onStopSession: vi.fn(),
});

describe('TimerActions', () => {
  // ── idle state ──────────────────────────────────────────────────────────────

  describe('idle state (not running, not paused)', () => {
    it('renders the "Start Working" button only', () => {
      renderWithProviders(
        <TimerActions
          isRunning={false}
          isPaused={false}
          {...makeCallbacks()}
        />
      );

      expect(screen.getByRole('button', { name: /start working/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop session/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
    });

    it('calls onStartTimer when "Start Working" is clicked', async () => {
      const callbacks = makeCallbacks();
      renderWithProviders(
        <TimerActions isRunning={false} isPaused={false} {...callbacks} />
      );

      await userEvent.click(screen.getByRole('button', { name: /start working/i }));

      expect(callbacks.onStartTimer).toHaveBeenCalledTimes(1);
    });
  });

  // ── running state ───────────────────────────────────────────────────────────

  describe('running state', () => {
    it('renders "Pause" and "Stop Session" buttons', () => {
      renderWithProviders(
        <TimerActions
          isRunning={true}
          isPaused={false}
          {...makeCallbacks()}
        />
      );

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop session/i })).toBeInTheDocument();
    });

    it('does not render "Start Working" or "Resume" in running state', () => {
      renderWithProviders(
        <TimerActions isRunning={true} isPaused={false} {...makeCallbacks()} />
      );

      expect(screen.queryByRole('button', { name: /start working/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
    });

    it('calls onPauseTimer when "Pause" is clicked', async () => {
      const callbacks = makeCallbacks();
      renderWithProviders(
        <TimerActions isRunning={true} isPaused={false} {...callbacks} />
      );

      await userEvent.click(screen.getByRole('button', { name: /pause/i }));

      expect(callbacks.onPauseTimer).toHaveBeenCalledTimes(1);
    });

    it('calls onStopSession when "Stop Session" is clicked', async () => {
      const callbacks = makeCallbacks();
      renderWithProviders(
        <TimerActions isRunning={true} isPaused={false} {...callbacks} />
      );

      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));

      expect(callbacks.onStopSession).toHaveBeenCalledTimes(1);
    });
  });

  // ── paused state ────────────────────────────────────────────────────────────

  describe('paused state', () => {
    it('renders "Resume" and "Stop Session" buttons', () => {
      renderWithProviders(
        <TimerActions
          isRunning={false}
          isPaused={true}
          {...makeCallbacks()}
        />
      );

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop session/i })).toBeInTheDocument();
    });

    it('does not render "Start Working" or "Pause" in paused state', () => {
      renderWithProviders(
        <TimerActions isRunning={false} isPaused={true} {...makeCallbacks()} />
      );

      expect(screen.queryByRole('button', { name: /start working/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    });

    it('calls onResumeTimer when "Resume" is clicked', async () => {
      const callbacks = makeCallbacks();
      renderWithProviders(
        <TimerActions isRunning={false} isPaused={true} {...callbacks} />
      );

      await userEvent.click(screen.getByRole('button', { name: /resume/i }));

      expect(callbacks.onResumeTimer).toHaveBeenCalledTimes(1);
    });

    it('calls onStopSession when "Stop Session" is clicked from paused state', async () => {
      const callbacks = makeCallbacks();
      renderWithProviders(
        <TimerActions isRunning={false} isPaused={true} {...callbacks} />
      );

      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));

      expect(callbacks.onStopSession).toHaveBeenCalledTimes(1);
    });
  });
});
