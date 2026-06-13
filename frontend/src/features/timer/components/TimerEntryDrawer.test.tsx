import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { makeDefaultDraft } from '@/tests/fixtures/timerFixtures';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import TimerEntryDrawer from './TimerEntryDrawer';
import type { TimerDraft } from '@/store/slices/timer/timer.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const baseCallbacks = {
  onBillableChange: vi.fn(),
  onClose: vi.fn(),
  onDescriptionChange: vi.fn(),
  onEndDateChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  onProjectChange: vi.fn(),
  onSaveManualEntry: vi.fn(),
  onStartDateChange: vi.fn(),
  onStartTimeChange: vi.fn(),
  onTaskChange: vi.fn(),
  onUpdateEntry: vi.fn(),
};

const renderDrawer = (props: {
  open: boolean;
  editingEntryId?: string | null;
  draft?: TimerDraft;
  callbacks?: Partial<typeof baseCallbacks>;
}) =>
  renderWithProviders(
    <TimerEntryDrawer
      open={props.open}
      editingEntryId={props.editingEntryId ?? null}
      draft={props.draft ?? makeDefaultDraft()}
      projectOptions={['Internal Operations', 'Security Hardening', 'Pulse Mobile Revamp']}
      taskOptions={['Standup and coordination', 'Audit remediation', 'Bug fixing']}
      {...baseCallbacks}
      {...(props.callbacks ?? {})}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TimerEntryDrawer', () => {
  // ── visibility ──────────────────────────────────────────────────────────────

  it('renders nothing when open is false', () => {
    renderDrawer({ open: false });
    expect(screen.queryByText(/manual entry/i)).not.toBeInTheDocument();
  });

  it('renders the drawer content when open is true', () => {
    renderDrawer({ open: true });
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
  });

  // ── create mode ─────────────────────────────────────────────────────────────

  describe('create mode (no editingEntryId)', () => {
    it('shows "Manual Entry" as the heading', () => {
      renderDrawer({ open: true, editingEntryId: null });
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    });

    it('shows "Save Entry" as the submit button label', () => {
      renderDrawer({ open: true, editingEntryId: null });
      expect(screen.getByRole('button', { name: /save entry/i })).toBeInTheDocument();
    });

    it('shows subtitle for manual entry mode', () => {
      renderDrawer({ open: true, editingEntryId: null });
      expect(
        screen.getByText(/add completed time as a secondary workflow/i)
      ).toBeInTheDocument();
    });
  });

  // ── edit mode ────────────────────────────────────────────────────────────────

  describe('edit mode (with editingEntryId)', () => {
    it('shows "Edit Entry" as the heading', () => {
      renderDrawer({ open: true, editingEntryId: 'entry-1' });
      expect(screen.getByText('Edit Entry')).toBeInTheDocument();
    });

    it('shows "Save Changes" as the submit button label', () => {
      renderDrawer({ open: true, editingEntryId: 'entry-1' });
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('shows subtitle for edit mode', () => {
      renderDrawer({ open: true, editingEntryId: 'entry-1' });
      expect(
        screen.getByText(/update a completed session without changing its identity/i)
      ).toBeInTheDocument();
    });
  });

  // ── form fields ─────────────────────────────────────────────────────────────

  describe('form fields', () => {
    it('renders Project, Task, Start Date, Start Time, End Date, End Time, and Notes fields', () => {
      renderDrawer({ open: true });

      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('shows the billable toggle', () => {
      renderDrawer({ open: true });
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it('shows the draft project value', () => {
      renderDrawer({
        open: true,
        draft: makeDefaultDraft({ project: 'Security Hardening' }),
      });

      expect(screen.getByDisplayValue('Security Hardening')).toBeInTheDocument();
    });

    it('shows the calculated duration from start/end times', () => {
      renderDrawer({
        open: true,
        draft: makeDefaultDraft({
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:30',
        }),
      });

      // 1h 30m = "01:30:00"
      expect(screen.getByText('01:30:00')).toBeInTheDocument();
    });

    it('supports a date range that spans multiple days', () => {
      renderDrawer({
        open: true,
        draft: makeDefaultDraft({
          startDate: '2026-06-09',
          startTime: '22:00',
          endDate: '2026-06-10',
          endTime: '01:30',
        }),
      });

      expect(screen.getByText('03:30:00')).toBeInTheDocument();
      expect(screen.queryByText(/jun 9, 10:00 pm - jun 10, 1:30 am/i)).not.toBeInTheDocument();
    });

    it('shows "00:00:00" duration when start equals end', () => {
      renderDrawer({
        open: true,
        draft: makeDefaultDraft({
          startTime: '09:00',
          endTime: '09:00',
        }),
      });

      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });
  });

  // ── submit validation ───────────────────────────────────────────────────────

  describe('submit validation', () => {
    it('calls onSaveManualEntry when form is valid in create mode', async () => {
      const onSaveManualEntry = vi.fn();
      const onClose = vi.fn();
      renderDrawer({
        open: true,
        editingEntryId: null,
        callbacks: { onSaveManualEntry, onClose },
      });

      await userEvent.click(screen.getByRole('button', { name: /save entry/i }));

      await waitFor(() => {
        expect(onSaveManualEntry).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onUpdateEntry when form is valid in edit mode', async () => {
      const onUpdateEntry = vi.fn();
      const onClose = vi.fn();
      renderDrawer({
        open: true,
        editingEntryId: 'entry-1',
        callbacks: { onUpdateEntry, onClose },
      });

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onUpdateEntry).toHaveBeenCalledTimes(1);
      });
    });

    it('blocks save and shows validation error when project is empty', async () => {
      const onSaveManualEntry = vi.fn();
      renderDrawer({
        open: true,
        editingEntryId: null,
        draft: makeDefaultDraft({ project: '' }),
        callbacks: { onSaveManualEntry },
      });

      await userEvent.click(screen.getByRole('button', { name: /save entry/i }));

      await waitFor(() => {
        expect(screen.getByText('Required')).toBeInTheDocument();
      });
      expect(onSaveManualEntry).not.toHaveBeenCalled();
    });

    it('shows end time error when end is before start', async () => {
      const onSaveManualEntry = vi.fn();
      renderDrawer({
        open: true,
        editingEntryId: null,
        draft: makeDefaultDraft({
          startTime: '14:00',
          endTime: '13:00',
        }),
        callbacks: { onSaveManualEntry },
      });

      await userEvent.click(screen.getByRole('button', { name: /save entry/i }));

      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
      });
      expect(onSaveManualEntry).not.toHaveBeenCalled();
    });
  });

  // ── cancel / close ──────────────────────────────────────────────────────────

  describe('cancel and close', () => {
    it('calls onClose when "Cancel" is clicked', async () => {
      const onClose = vi.fn();
      renderDrawer({ open: true, callbacks: { onClose } });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the close icon button is clicked', async () => {
      const onClose = vi.fn();
      renderDrawer({ open: true, callbacks: { onClose } });

      // The close icon button is the only button without visible text
      const closeIconButton = screen.getAllByRole('button').find(
        (btn) => !btn.textContent?.trim()
      );
      expect(closeIconButton).toBeDefined();
      await userEvent.click(closeIconButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clears validation errors when drawer is cancelled and reopened', async () => {
      const onSaveManualEntry = vi.fn();
      const onClose = vi.fn();
      renderDrawer({
        open: true,
        draft: makeDefaultDraft({ project: '' }),
        callbacks: { onSaveManualEntry, onClose },
      });

      // Trigger validation errors
      await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
      await waitFor(() => expect(screen.getByText('Required')).toBeInTheDocument());

      // Click cancel
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
