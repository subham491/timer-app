import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTimerEntryForm } from '@/features/timer/hooks';
import type { TimerDraft, TimerEntry } from '@/store/slices/timer/timer.types';

const createDraft = (overrides: Partial<TimerDraft> = {}): TimerDraft => ({
  description: 'Team sync preparation',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-05-26',
  startTime: '09:00',
  endDate: '2026-05-26',
  endTime: '10:00',
  ...overrides,
});

const createCallbacks = () => ({
  onCancelEdit: vi.fn(),
  onClearDraft: vi.fn(),
  onModeChange: vi.fn(),
  onSaveManualEntry: vi.fn(),
  onStartOrStopTimer: vi.fn(),
  onUpdateEntry: vi.fn(),
});

describe('useTimerEntryForm', () => {
  it('submits timer action when the draft is valid and no active entry exists', async () => {
    const callbacks = createCallbacks();
    // Draft created OUTSIDE renderHook — stable reference, no infinite loop
    const draft = createDraft();

    const { result } = renderHook(() =>
      useTimerEntryForm({ activeEntry: null, draft, ...callbacks })
    );

    await act(async () => {
      await result.current.handleTimerAction();
    });

    expect(callbacks.onStartOrStopTimer).toHaveBeenCalledTimes(1);
  });

  it('blocks manual save and exposes validation errors for an invalid draft', async () => {
    const callbacks = createCallbacks();
    const draft = createDraft({ project: '', task: '' });

    const { result } = renderHook(() =>
      useTimerEntryForm({ activeEntry: null, draft, ...callbacks })
    );

    await act(async () => {
      await result.current.handleManualSave();
    });

    await waitFor(() => {
      expect(result.current.errors.project?.message).toBe('Required');
      expect(result.current.errors.task?.message).toBe('Required');
    });

    expect(callbacks.onSaveManualEntry).not.toHaveBeenCalled();
  });

  it('bypasses form validation when stopping an active timer', async () => {
    const callbacks = createCallbacks();
    const draft = createDraft({ project: '', task: '' });

    const activeEntry: TimerEntry = {
      id: 'active-entry-1',
      description: 'Live work',
      project: 'Internal Operations',
      task: 'Standup and coordination',
      billable: true,
      startDate: '2026-05-26',
      startTime: '11:00',
      endDate: null,
      endTime: null,
      durationSeconds: 120,
      startedAt: '2026-05-26T11:00:00.000Z',
      endedAt: null,
      runningStartedAt: '2026-05-26T11:00:00.000Z',
      status: 'running',
    };

    const { result } = renderHook(() =>
      useTimerEntryForm({ activeEntry, draft, ...callbacks })
    );

    act(() => {
      result.current.handleTimerAction();
    });

    expect(callbacks.onStartOrStopTimer).toHaveBeenCalledTimes(1);
  });

  it('forwards mode and reset actions to the provided callbacks', () => {
    const callbacks = createCallbacks();
    const draft = createDraft();

    const { result } = renderHook(() =>
      useTimerEntryForm({ activeEntry: null, draft, ...callbacks })
    );

    act(() => {
      result.current.handleModeChange('manual');
      result.current.handleReset();
      result.current.handleCancelEdit();
    });

    expect(callbacks.onModeChange).toHaveBeenCalledWith('manual');
    expect(callbacks.onClearDraft).toHaveBeenCalledTimes(1);
    expect(callbacks.onCancelEdit).toHaveBeenCalledTimes(1);
  });
});