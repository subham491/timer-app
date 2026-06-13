import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { makeRunningEntry, makeDefaultDraft } from '@/tests/fixtures/timerFixtures';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import TimerEntryPanel from './TimerEntryPanel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const baseCallbacks = {
  onBillableChange: vi.fn(),
  onCancelEdit: vi.fn(),
  onClearDraft: vi.fn(),
  onDescriptionChange: vi.fn(),
  onEndDateChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  onModeChange: vi.fn(),
  onProjectChange: vi.fn(),
  onSaveManualEntry: vi.fn(),
  onStartDateChange: vi.fn(),
  onStartOrStopTimer: vi.fn(),
  onStartTimeChange: vi.fn(),
  onTaskChange: vi.fn(),
  onUpdateEntry: vi.fn(),
};

const renderPanel = (overrides: Partial<Parameters<typeof TimerEntryPanel>[0]> = {}) =>
  renderWithProviders(
    <TimerEntryPanel
      activeEntry={null}
      draft={makeDefaultDraft()}
      editingEntryId={null}
      entryMode="timer"
      projectOptions={['Internal Operations', 'Security Hardening']}
      taskOptions={['Standup and coordination', 'Audit remediation']}
      {...baseCallbacks}
      {...overrides}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TimerEntryPanel', () => {
  // ── heading ─────────────────────────────────────────────────────────────────

  describe('heading', () => {
    it('shows "New entry" heading when not editing', () => {
      renderPanel();
      expect(screen.getByText('New entry')).toBeInTheDocument();
    });

    it('shows "Edit entry" heading when editingEntryId is set', () => {
      renderPanel({ editingEntryId: 'entry-1' });
      expect(screen.getByText('Edit entry')).toBeInTheDocument();
    });
  });

  // ── mode chips ───────────────────────────────────────────────────────────────

  describe('mode chips', () => {
    it('renders both Timer mode and Manual mode chips', () => {
      renderPanel();
      expect(screen.getByText('Timer mode')).toBeInTheDocument();
      expect(screen.getByText('Manual mode')).toBeInTheDocument();
    });

    it('calls onModeChange with "manual" when Manual mode chip is clicked', async () => {
      const onModeChange = vi.fn();
      renderPanel({ onModeChange });
      await userEvent.click(screen.getByText('Manual mode'));
      expect(onModeChange).toHaveBeenCalledWith('manual');
    });

    it('calls onModeChange with "timer" when Timer mode chip is clicked', async () => {
      const onModeChange = vi.fn();
      renderPanel({ entryMode: 'manual', onModeChange });
      await userEvent.click(screen.getByText('Timer mode'));
      expect(onModeChange).toHaveBeenCalledWith('timer');
    });
  });

  // ── timer mode ───────────────────────────────────────────────────────────────

  describe('timer mode (no active entry)', () => {
    it('shows the "Start" button in timer mode when no active entry', () => {
      renderPanel({ entryMode: 'timer', activeEntry: null });
      expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
    });

    it('does not show date/time fields in timer mode', () => {
      renderPanel({ entryMode: 'timer' });
      expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/end time/i)).not.toBeInTheDocument();
    });

    it('calls onStartOrStopTimer when the Start button is clicked with a valid draft', async () => {
      const onStartOrStopTimer = vi.fn();
      renderPanel({ entryMode: 'timer', onStartOrStopTimer });
      await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
      await waitFor(() => {
        expect(onStartOrStopTimer).toHaveBeenCalledTimes(1);
      });
    });

    it('shows the "Reset" button when not editing', () => {
      renderPanel({ editingEntryId: null });
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('calls onClearDraft when Reset is clicked', async () => {
      const onClearDraft = vi.fn();
      renderPanel({ onClearDraft });
      await userEvent.click(screen.getByRole('button', { name: /reset/i }));
      expect(onClearDraft).toHaveBeenCalledTimes(1);
    });
  });

  // ── running state ────────────────────────────────────────────────────────────

  describe('timer mode (with active entry — running)', () => {
    const runningEntry = makeRunningEntry({ durationSeconds: 900 });

    it('shows the "Stop" button when a timer is active', () => {
      renderPanel({ activeEntry: runningEntry, entryMode: 'timer' });
      expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument();
    });

    it('calls onStartOrStopTimer when the Stop button is clicked', async () => {
      const onStartOrStopTimer = vi.fn();
      renderPanel({ activeEntry: runningEntry, entryMode: 'timer', onStartOrStopTimer });
      await userEvent.click(screen.getByRole('button', { name: /^stop$/i }));
      expect(onStartOrStopTimer).toHaveBeenCalledTimes(1);
    });

    it('displays the formatted duration from the active entry', () => {
      renderPanel({ activeEntry: runningEntry, entryMode: 'timer' });
      // 900s = 15 minutes = 00:15:00
      expect(screen.getByText('00:15:00')).toBeInTheDocument();
    });
  });

  // ── manual mode ──────────────────────────────────────────────────────────────

  describe('manual mode', () => {
    it('shows date and time fields in manual mode', () => {
      renderPanel({ entryMode: 'manual' });
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    });

    it('shows the "Save time" button in manual mode', () => {
      renderPanel({ entryMode: 'manual' });
      expect(screen.getByRole('button', { name: /save time/i })).toBeInTheDocument();
    });

    it('calls onSaveManualEntry when "Save time" is clicked with a valid draft', async () => {
      const onSaveManualEntry = vi.fn();
      renderPanel({
        entryMode: 'manual',
        onSaveManualEntry,
        draft: makeDefaultDraft({
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        }),
      });
      await userEvent.click(screen.getByRole('button', { name: /save time/i }));
      await waitFor(() => {
        expect(onSaveManualEntry).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onSaveManualEntry when end is before start', async () => {
      const onSaveManualEntry = vi.fn();
      renderPanel({
        entryMode: 'manual',
        onSaveManualEntry,
        draft: makeDefaultDraft({
          startTime: '14:00',
          endTime: '13:00',
        }),
      });
      await userEvent.click(screen.getByRole('button', { name: /save time/i }));
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
      });
      expect(onSaveManualEntry).not.toHaveBeenCalled();
    });
  });

  // ── edit mode ────────────────────────────────────────────────────────────────

  describe('edit mode', () => {
    it('shows "Update" button instead of Start/Save when editing', () => {
      renderPanel({ editingEntryId: 'entry-1' });
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('shows "Cancel" button instead of Reset when editing', () => {
      renderPanel({ editingEntryId: 'entry-1' });
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onCancelEdit when Cancel is clicked', async () => {
      const onCancelEdit = vi.fn();
      renderPanel({ editingEntryId: 'entry-1', onCancelEdit });
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancelEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onUpdateEntry when Update is clicked with valid draft', async () => {
      const onUpdateEntry = vi.fn();
      renderPanel({ editingEntryId: 'entry-1', onUpdateEntry });
      await userEvent.click(screen.getByRole('button', { name: /update/i }));
      await waitFor(() => {
        expect(onUpdateEntry).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── shared fields ────────────────────────────────────────────────────────────

  describe('shared fields', () => {
    it('renders Note, Project, Task, and Billable fields', () => {
      renderPanel();
      expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task/i)).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('shows draft project value', () => {
      renderPanel({ draft: makeDefaultDraft({ project: 'Security Hardening' }) });
      expect(screen.getByDisplayValue('Security Hardening')).toBeInTheDocument();
    });

    it('shows "00:00:00" duration when there is no active entry', () => {
      renderPanel({ activeEntry: null });
      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });
  });
});
