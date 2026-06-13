import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';

import {
  makeRunningEntry,
  makePausedEntry,
} from '@/tests/fixtures/timerFixtures';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import CurrentFocusCard from './CurrentFocusCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Typed via ComponentProps so activeEntry accepts TimerEntry | null — not just null
const defaultProps: ComponentProps<typeof CurrentFocusCard> = {
  activeEntry: null,
  isPausingTimer: false,
  isResumingTimer: false,
  isStartingTimer: false,
  isStoppingTimer: false,
  onPauseTimer: vi.fn(),
  onProjectChange: vi.fn(),
  onResumeTimer: vi.fn(),
  onStartOrStopTimer: vi.fn(),
  onTaskChange: vi.fn(),
  project: 'Internal Operations',
  projects: ['Internal Operations', 'Pulse Mobile Revamp', 'Security Hardening'],
  task: 'Standup and coordination',
  tasks: ['Standup and coordination', 'Documentation', 'Internal review'],
};

const renderCard = (
  props: Partial<ComponentProps<typeof CurrentFocusCard>> = {}
) =>
  renderWithProviders(
    <CurrentFocusCard {...defaultProps} {...props} />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CurrentFocusCard', () => {
  // ── idle state ──────────────────────────────────────────────────────────────

  describe('idle state', () => {
    it('renders "Current Focus" heading', () => {
      renderCard();
      expect(screen.getByText('Current Focus')).toBeInTheDocument();
    });

    it('enables project and task selects when no active session', () => {
      renderCard();
      const selects = screen.getAllByRole('combobox');
      selects.forEach((select) => {
        expect(select).not.toBeDisabled();
      });
    });

    it('shows the "Start Working" button when idle', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /start working/i })).toBeInTheDocument();
    });

    it('shows idle description text', () => {
      renderCard();
      expect(
        screen.getByText(/choose a project and keep this screen intentionally quiet/i)
      ).toBeInTheDocument();
    });
  });

  // ── running state ───────────────────────────────────────────────────────────

  describe('running state', () => {
    it('disables project and task selects when a session is active', () => {
      renderCard({ activeEntry: makeRunningEntry() });
      const selects = screen.getAllByRole('combobox');
      // MUI disabled Select uses aria-disabled, not the HTML disabled attribute
      selects.forEach((select) => {
        expect(select).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('shows "Pause" and "Stop Session" buttons when running', () => {
      renderCard({ activeEntry: makeRunningEntry() });
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop session/i })).toBeInTheDocument();
    });

    it('shows active session description text', () => {
      renderCard({ activeEntry: makeRunningEntry() });
      expect(
        screen.getByText(/a calm workspace for the session already in motion/i)
      ).toBeInTheDocument();
    });

    it('calls onPauseTimer when "Pause" is clicked', async () => {
      const onPauseTimer = vi.fn();
      renderCard({ activeEntry: makeRunningEntry(), onPauseTimer });
      await userEvent.click(screen.getByRole('button', { name: /pause/i }));
      expect(onPauseTimer).toHaveBeenCalledTimes(1);
    });
  });

  // ── paused state ────────────────────────────────────────────────────────────

  describe('paused state', () => {
    it('shows "Resume" and "Stop Session" buttons when paused', () => {
      renderCard({ activeEntry: makePausedEntry() });
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop session/i })).toBeInTheDocument();
    });

    it('calls onResumeTimer when "Resume" is clicked', async () => {
      const onResumeTimer = vi.fn();
      renderCard({ activeEntry: makePausedEntry(), onResumeTimer });
      await userEvent.click(screen.getByRole('button', { name: /resume/i }));
      expect(onResumeTimer).toHaveBeenCalledTimes(1);
    });
  });

  // ── stop session modal ──────────────────────────────────────────────────────

  describe('stop session modal', () => {
    it('opens the StopSessionModal when "Stop Session" is clicked', async () => {
      renderCard({ activeEntry: makeRunningEntry() });
      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      expect(screen.getByText('Complete session')).toBeInTheDocument();
    });

    it('closes the modal when "Cancel" is clicked', async () => {
      renderCard({ activeEntry: makeRunningEntry() });
      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Complete session')).not.toBeInTheDocument();
      });
    });

    it('calls onStartOrStopTimer with notes when "Save Session" is clicked', async () => {
      const onStartOrStopTimer = vi.fn();
      renderCard({ activeEntry: makeRunningEntry(), onStartOrStopTimer });
      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      await userEvent.type(screen.getByLabelText(/notes/i), 'Completed review');
      await userEvent.click(screen.getByRole('button', { name: /save session/i }));
      expect(onStartOrStopTimer).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Completed review' })
      );
    });

    it('opens with the billable toggle on by default', async () => {
      renderCard({ activeEntry: makeRunningEntry({ billable: false }) });
      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('keeps the toggled billable value when the running entry rerenders with a new object', async () => {
      const { rerender } = renderCard({
        activeEntry: makeRunningEntry({ id: 'running-1', billable: true }),
      });

      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      const billableSwitch = screen.getByRole('switch');
      expect(billableSwitch).toBeChecked();

      await userEvent.click(billableSwitch);
      expect(billableSwitch).not.toBeChecked();

      rerender(
        <CurrentFocusCard
          {...defaultProps}
          activeEntry={makeRunningEntry({
            id: 'running-1',
            billable: true,
            durationSeconds: 301,
          })}
        />
      );

      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('resets the billable toggle to on when the modal is reopened', async () => {
      renderCard({ activeEntry: makeRunningEntry({ id: 'running-1', billable: true }) });

      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      const billableSwitch = screen.getByRole('switch');
      await userEvent.click(billableSwitch);
      expect(billableSwitch).not.toBeChecked();

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('Complete session')).not.toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('closes the modal automatically when activeEntry becomes null', async () => {
      const { rerender } = renderCard({ activeEntry: makeRunningEntry() });
      await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
      expect(screen.getByText('Complete session')).toBeInTheDocument();

      rerender(
        <CurrentFocusCard
          {...defaultProps}
          activeEntry={null}
          onStartOrStopTimer={vi.fn()}
        />
      );
      await waitFor(() => {
        expect(screen.queryByText('Complete session')).not.toBeInTheDocument();
      });
    });
  });

  // ── project / task display ──────────────────────────────────────────────────

  describe('project and task display', () => {
    it('shows draft project/task values when no active entry', () => {
      renderCard({ project: 'Security Hardening', task: 'Audit remediation' });
      expect(screen.getByDisplayValue('Security Hardening')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Audit remediation')).toBeInTheDocument();
    });

    it('shows the active entry project when a session is running', () => {
      const entry = makeRunningEntry({
        project: 'Pulse Mobile Revamp',
        task: 'Sprint planning',
      });
      renderCard({ activeEntry: entry, project: 'Internal Operations' });
      expect(screen.getByDisplayValue('Pulse Mobile Revamp')).toBeInTheDocument();
    });
  });
});
