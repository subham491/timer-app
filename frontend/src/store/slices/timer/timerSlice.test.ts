import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import timerReducer, {
  addManualEntry,
  applyEntryToDraft,
  beginEditEntry,
  cancelEditing,
  clearDraft,
  hydrateResumedTimer,
  pauseTimer,
  resumeEntry,
  resumePausedTimer,
  saveEditedEntry,
  startTimer,
  stopTimer,
  updateDraft,
} from './timerSlice';
import type { TimerEntry, TimerState } from './timer.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-06-09T10:00:00.000Z');

const makeStoppedEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-1',
  description: 'Test entry',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-06-09',
  startTime: '09:00',
  endDate: '2026-06-09',
  endTime: '10:00',
  durationSeconds: 3600,
  startedAt: '2026-06-09T09:00:00.000Z',
  endedAt: '2026-06-09T10:00:00.000Z',
  runningStartedAt: null,
  status: 'stopped',
  ...overrides,
});

const makeRunningEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-running',
  description: 'Running work',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-06-09',
  startTime: '09:00',
  endDate: null,
  endTime: null,
  durationSeconds: 0,
  startedAt: '2026-06-09T09:00:00.000Z',
  endedAt: null,
  runningStartedAt: '2026-06-09T09:00:00.000Z',
  status: 'running',
  ...overrides,
});

const makePausedEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-paused',
  description: 'Paused work',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-06-09',
  startTime: '09:00',
  endDate: '2026-06-09',
  endTime: '09:30',
  durationSeconds: 1800,
  startedAt: '2026-06-09T09:00:00.000Z',
  endedAt: '2026-06-09T09:30:00.000Z',
  runningStartedAt: null,
  status: 'paused',
  ...overrides,
});

const makeInitialState = (overrides: Partial<TimerState> = {}): TimerState => ({
  entries: [],
  draft: {
    description: '',
    project: 'Internal Operations',
    task: 'Standup and coordination',
    billable: true,
    startDate: '2026-06-09',
    startTime: '09:00',
    endDate: '2026-06-09',
    endTime: '09:00',
  },
  activeEntryId: null,
  editingEntryId: null,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('timerSlice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── updateDraft ─────────────────────────────────────────────────────────────

  describe('updateDraft', () => {
    it('merges partial fields into the draft without removing others', () => {
      const state = makeInitialState();
      const next = timerReducer(
        state,
        updateDraft({ description: 'New description', billable: false })
      );

      expect(next.draft.description).toBe('New description');
      expect(next.draft.billable).toBe(false);
      expect(next.draft.project).toBe('Internal Operations');
    });

    it('can update a single field leaving the rest intact', () => {
      const state = makeInitialState();
      const next = timerReducer(state, updateDraft({ task: 'Bug fixing' }));

      expect(next.draft.task).toBe('Bug fixing');
      expect(next.draft.project).toBe('Internal Operations');
    });
  });

  // ── clearDraft ──────────────────────────────────────────────────────────────

  describe('clearDraft', () => {
    it('resets description to empty string', () => {
      const state = makeInitialState({
        draft: {
          description: 'Some work',
          project: 'Pulse Mobile Revamp',
          task: 'Bug fixing',
          billable: false,
          startDate: '2026-06-08',
          startTime: '10:00',
          endDate: '2026-06-08',
          endTime: '11:00',
        },
      });

      const next = timerReducer(state, clearDraft());

      expect(next.draft.description).toBe('');
    });

    it('clears editingEntryId', () => {
      const state = makeInitialState({ editingEntryId: 'entry-1' });
      const next = timerReducer(state, clearDraft());

      expect(next.editingEntryId).toBeNull();
    });

    it('retains default project and task after clear', () => {
      const state = makeInitialState();
      const next = timerReducer(state, clearDraft());

      expect(next.draft.project).toBe('Internal Operations');
      expect(next.draft.task).toBe('Standup and coordination');
    });
  });

  // ── applyEntryToDraft ────────────────────────────────────────────────────────

  describe('applyEntryToDraft', () => {
    it('copies all editable fields from the matching entry to the draft', () => {
      const entry = makeStoppedEntry({
        id: 'entry-1',
        description: 'Audit work',
        project: 'Security Hardening',
        task: 'Audit remediation',
        billable: false,
      });
      const state = makeInitialState({ entries: [entry] });

      const next = timerReducer(state, applyEntryToDraft({ entryId: 'entry-1' }));

      expect(next.draft.description).toBe('Audit work');
      expect(next.draft.project).toBe('Security Hardening');
      expect(next.draft.task).toBe('Audit remediation');
      expect(next.draft.billable).toBe(false);
    });

    it('does nothing when the entry id is not found', () => {
      const state = makeInitialState({ entries: [makeStoppedEntry()] });
      const before = state.draft;
      const next = timerReducer(state, applyEntryToDraft({ entryId: 'nonexistent' }));

      expect(next.draft).toEqual(before);
    });

    it('falls back to startDate when endDate is null', () => {
      const entry = makeRunningEntry({
        id: 'entry-1',
        startDate: '2026-06-09',
        endDate: null,
      });
      const state = makeInitialState({ entries: [entry] });

      const next = timerReducer(state, applyEntryToDraft({ entryId: 'entry-1' }));

      expect(next.draft.endDate).toBe('2026-06-09');
    });
  });

  // ── startTimer ──────────────────────────────────────────────────────────────

  describe('startTimer', () => {
    it('creates a new running entry and sets activeEntryId', () => {
      const state = makeInitialState({
        draft: {
          description: 'Starting fresh work',
          project: 'Pulse Mobile Revamp',
          task: 'Sprint planning',
          billable: true,
          startDate: '2026-06-09',
          startTime: '10:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      });

      const next = timerReducer(state, startTimer());

      expect(next.activeEntryId).not.toBeNull();
      expect(next.entries).toHaveLength(1);

      const created = next.entries[0];
      expect(created.status).toBe('running');
      expect(created.durationSeconds).toBe(0);
      expect(created.endDate).toBeNull();
      expect(created.endTime).toBeNull();
      expect(created.endedAt).toBeNull();
      expect(created.runningStartedAt).toBe(FIXED_NOW.toISOString());
    });

    it('uses draft description when provided', () => {
      const state = makeInitialState({
        draft: {
          description: 'My focused task',
          project: 'Internal Operations',
          task: 'Documentation',
          billable: false,
          startDate: '2026-06-09',
          startTime: '10:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      });

      const next = timerReducer(state, startTimer());

      expect(next.entries[0].description).toBe('My focused task');
    });

    it('falls back to "Focused work session" when description is empty', () => {
      const state = makeInitialState({
        draft: {
          description: '',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '10:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      });

      const next = timerReducer(state, startTimer());

      expect(next.entries[0].description).toBe('Focused work session');
    });

    it('does not start a second timer when one is already active', () => {
      const runningEntry = makeRunningEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [runningEntry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, startTimer());

      expect(next.entries).toHaveLength(1);
      expect(next.activeEntryId).toBe('entry-active');
    });

    it('clears editingEntryId when starting a timer', () => {
      const state = makeInitialState({ editingEntryId: 'entry-1' });

      const next = timerReducer(state, startTimer());

      expect(next.editingEntryId).toBeNull();
    });

    it('prepends the new entry to the front of the list', () => {
      const existing = makeStoppedEntry({ id: 'entry-old' });
      const state = makeInitialState({ entries: [existing] });

      const next = timerReducer(state, startTimer());

      expect(next.entries[0].id).not.toBe('entry-old');
      expect(next.entries[1].id).toBe('entry-old');
    });
  });

  // ── pauseTimer ──────────────────────────────────────────────────────────────

  describe('pauseTimer', () => {
    it('transitions a running entry to paused and freezes duration', () => {
      const runningStartedAt = new Date(FIXED_NOW.getTime() - 300_000).toISOString(); // 5 min ago
      const entry = makeRunningEntry({
        id: 'entry-active',
        durationSeconds: 0,
        runningStartedAt,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, pauseTimer());

      const paused = next.entries.find((e) => e.id === 'entry-active')!;
      expect(paused.status).toBe('paused');
      expect(paused.runningStartedAt).toBeNull();
      expect(paused.durationSeconds).toBeGreaterThanOrEqual(300);
    });

    it('accumulates duration across multiple running periods', () => {
      const runningStartedAt = new Date(FIXED_NOW.getTime() - 60_000).toISOString(); // 1 min ago
      const entry = makeRunningEntry({
        id: 'entry-active',
        durationSeconds: 120, // already has 2 mins from before
        runningStartedAt,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, pauseTimer());

      const paused = next.entries[0];
      expect(paused.durationSeconds).toBeGreaterThanOrEqual(180); // 2 + 1 = 3 min
    });

    it('does nothing when there is no active entry', () => {
      const state = makeInitialState({ entries: [makeStoppedEntry()] });
      const next = timerReducer(state, pauseTimer());

      expect(next).toEqual(state);
    });

    it('does nothing when the active entry is not in running state', () => {
      const pausedEntry = makePausedEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [pausedEntry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, pauseTimer());

      expect(next.entries[0].status).toBe('paused');
      expect(next.entries[0].runningStartedAt).toBeNull();
    });

    it('uses the provided elapsedSeconds when it is greater than computed', () => {
      const runningStartedAt = new Date(FIXED_NOW.getTime() - 10_000).toISOString();
      const entry = makeRunningEntry({
        id: 'entry-active',
        durationSeconds: 0,
        runningStartedAt,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, pauseTimer({ elapsedSeconds: 999 }));

      expect(next.entries[0].durationSeconds).toBe(999);
    });
  });

  // ── resumePausedTimer ────────────────────────────────────────────────────────

  describe('resumePausedTimer', () => {
    it('transitions a paused entry back to running', () => {
      const pausedEntry = makePausedEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [pausedEntry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, resumePausedTimer());

      const resumed = next.entries[0];
      expect(resumed.status).toBe('running');
      expect(resumed.runningStartedAt).toBe(FIXED_NOW.toISOString());
      expect(resumed.endDate).toBeNull();
      expect(resumed.endTime).toBeNull();
      expect(resumed.endedAt).toBeNull();
    });

    it('does nothing when there is no active entry', () => {
      const state = makeInitialState();
      const next = timerReducer(state, resumePausedTimer());

      expect(next).toEqual(state);
    });

    it('does nothing when the active entry is not paused', () => {
      const runningEntry = makeRunningEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [runningEntry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, resumePausedTimer());

      // runningStartedAt should remain unchanged
      expect(next.entries[0].runningStartedAt).toBe(runningEntry.runningStartedAt);
    });

    it('preserves accumulated elapsed time when hydrating a resumed backend timer', () => {
      const state = makeInitialState({
        entries: [makePausedEntry({ id: 'entry-active', durationSeconds: 15 })],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(
        state,
        hydrateResumedTimer({
          entry: {
            id: 'entry-active',
            status: 'running',
            source: 'timer',
            isBillable: true,
            startAt: '2026-06-09T09:59:45.000Z',
            endAt: null,
            durationSeconds: null,
            workNote: 'Paused work',
            project: {
              id: 'project-1',
              name: 'Internal Operations',
              status: 'active',
              isTimerReady: true,
              timerReadinessReason: null,
              code: null,
            },
            task: {
              id: 'task-1',
              name: 'Standup and coordination',
              projectId: 'project-1',
              status: 'active',
            },
            user: {
              id: 'user-1',
              name: 'Tester',
              email: 'tester@example.com',
            },
            createdAt: '2026-06-09T09:59:45.000Z',
            updatedAt: '2026-06-09T10:00:00.000Z',
            canDelete: false,
            canEdit: false,
            durationDisplay: null,
          },
          resumedAt: '2026-06-09T10:00:00.000Z',
        })
      );

      expect(next.entries[0].status).toBe('running');
      expect(next.entries[0].durationSeconds).toBe(15);
      expect(next.entries[0].runningStartedAt).toBe('2026-06-09T10:00:00.000Z');
    });
  });

  // ── stopTimer ───────────────────────────────────────────────────────────────

  describe('stopTimer', () => {
    it('stops the running timer, calculates duration, and clears activeEntryId', () => {
      const runningStartedAt = new Date(FIXED_NOW.getTime() - 1800_000).toISOString(); // 30 min
      const entry = makeRunningEntry({
        id: 'entry-active',
        durationSeconds: 0,
        runningStartedAt,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer());

      const stopped = next.entries[0];
      expect(stopped.status).toBe('stopped');
      expect(stopped.endedAt).toBe(FIXED_NOW.toISOString());
      expect(stopped.runningStartedAt).toBeNull();
      expect(stopped.durationSeconds).toBeGreaterThanOrEqual(1800);
      expect(next.activeEntryId).toBeNull();
    });

    it('updates description when notes payload is provided', () => {
      const entry = makeRunningEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer({ notes: 'Finished the PR review' }));

      expect(next.entries[0].description).toBe('Finished the PR review');
    });

    it('ignores empty/whitespace-only notes', () => {
      const entry = makeRunningEntry({ id: 'entry-active', description: 'Original' });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer({ notes: '   ' }));

      expect(next.entries[0].description).toBe('Original');
    });

    it('overrides billable when payload includes it', () => {
      const entry = makeRunningEntry({ id: 'entry-active', billable: true });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer({ billable: false }));

      expect(next.entries[0].billable).toBe(false);
    });

    it('carries last entry context into the draft after stopping', () => {
      const entry = makeRunningEntry({
        id: 'entry-active',
        description: 'Completed task',
        project: 'Security Hardening',
        task: 'Audit remediation',
        billable: false,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer());

      expect(next.draft.project).toBe('Security Hardening');
      expect(next.draft.task).toBe('Audit remediation');
      expect(next.draft.billable).toBe(false);
    });

    it('does nothing when there is no active entry', () => {
      const state = makeInitialState();
      const next = timerReducer(state, stopTimer());

      expect(next).toEqual(state);
    });

    it('calculates duration via timestamps when elapsed is zero at stop', () => {
      // entry has durationSeconds 0 and runningStartedAt == now
      // should fall back to timestamp-based calc
      const runningStartedAt = new Date(FIXED_NOW.getTime() - 600_000).toISOString(); // 10 min ago
      const entry = makeRunningEntry({
        id: 'entry-active',
        durationSeconds: 0,
        runningStartedAt,
        startedAt: runningStartedAt,
      });
      const state = makeInitialState({
        entries: [entry],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, stopTimer());

      expect(next.entries[0].durationSeconds).toBeGreaterThan(0);
    });
  });

  // ── addManualEntry ───────────────────────────────────────────────────────────

  describe('addManualEntry', () => {
    it('creates a stopped entry from draft fields', () => {
      const state = makeInitialState({
        draft: {
          description: 'Wrote documentation',
          project: 'Internal Operations',
          task: 'Documentation',
          billable: false,
          startDate: '2026-06-09',
          startTime: '08:00',
          endDate: '2026-06-09',
          endTime: '09:30',
        },
      });

      const next = timerReducer(state, addManualEntry());

      expect(next.entries).toHaveLength(1);
      const entry = next.entries[0];
      expect(entry.status).toBe('stopped');
      expect(entry.description).toBe('Wrote documentation');
      expect(entry.durationSeconds).toBe(5400); // 1h 30min
    });

    it('calculates duration correctly from start/end times', () => {
      const state = makeInitialState({
        draft: {
          description: 'Quick 15-min call',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '09:15',
        },
      });

      const next = timerReducer(state, addManualEntry());

      expect(next.entries[0].durationSeconds).toBe(900);
    });

    it('prepends the new entry to the entries array', () => {
      const existing = makeStoppedEntry({ id: 'entry-old' });
      const state = makeInitialState({
        entries: [existing],
        draft: {
          description: 'Newer entry',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '10:00',
          endDate: '2026-06-09',
          endTime: '11:00',
        },
      });

      const next = timerReducer(state, addManualEntry());

      expect(next.entries[0].description).toBe('Newer entry');
      expect(next.entries[1].id).toBe('entry-old');
    });

    it('resets draft to defaults after saving', () => {
      const state = makeInitialState({
        draft: {
          description: 'Custom work',
          project: 'Security Hardening',
          task: 'Audit remediation',
          billable: false,
          startDate: '2026-06-09',
          startTime: '08:00',
          endDate: '2026-06-09',
          endTime: '09:00',
        },
      });

      const next = timerReducer(state, addManualEntry());

      expect(next.draft.description).toBe('');
      expect(next.draft.project).toBe('Internal Operations');
    });

    it('clears editingEntryId after saving', () => {
      const state = makeInitialState({ editingEntryId: 'entry-edit' });
      const next = timerReducer(state, addManualEntry());

      expect(next.editingEntryId).toBeNull();
    });

    it('falls back to "Manual time entry" when description is empty', () => {
      const state = makeInitialState({
        draft: {
          description: '',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      });

      const next = timerReducer(state, addManualEntry());

      expect(next.entries[0].description).toBe('Manual time entry');
    });
  });

  // ── beginEditEntry ───────────────────────────────────────────────────────────

  describe('beginEditEntry', () => {
    it('loads the entry into draft and sets editingEntryId', () => {
      const entry = makeStoppedEntry({
        id: 'entry-1',
        description: 'Review PR',
        project: 'Pulse Mobile Revamp',
        task: 'Bug fixing',
        billable: false,
      });
      const state = makeInitialState({ entries: [entry] });

      const next = timerReducer(state, beginEditEntry({ entryId: 'entry-1' }));

      expect(next.editingEntryId).toBe('entry-1');
      expect(next.draft.description).toBe('Review PR');
      expect(next.draft.project).toBe('Pulse Mobile Revamp');
      expect(next.draft.billable).toBe(false);
    });

    it('does nothing when entry is not found', () => {
      const state = makeInitialState({ entries: [makeStoppedEntry()] });
      const before = state.editingEntryId;

      const next = timerReducer(state, beginEditEntry({ entryId: 'missing' }));

      expect(next.editingEntryId).toBe(before);
    });

    it('does nothing when the entry is currently running', () => {
      const running = makeRunningEntry({ id: 'entry-active' });
      const state = makeInitialState({
        entries: [running],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, beginEditEntry({ entryId: 'entry-active' }));

      expect(next.editingEntryId).toBeNull();
    });
  });

  // ── saveEditedEntry ──────────────────────────────────────────────────────────

  describe('saveEditedEntry', () => {
    it('updates the target entry from draft and clears editingEntryId', () => {
      const entry = makeStoppedEntry({ id: 'entry-1' });
      const state: TimerState = {
        entries: [entry],
        activeEntryId: null,
        editingEntryId: 'entry-1',
        draft: {
          description: 'Updated description',
          project: 'Security Hardening',
          task: 'Access review',
          billable: false,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:30',
        },
      };

      const next = timerReducer(state, saveEditedEntry());

      const updated = next.entries[0];
      expect(updated.description).toBe('Updated description');
      expect(updated.project).toBe('Security Hardening');
      expect(updated.billable).toBe(false);
      expect(updated.durationSeconds).toBe(5400); // 1h 30min
      expect(next.editingEntryId).toBeNull();
    });

    it('recalculates durationSeconds from updated start/end times', () => {
      const entry = makeStoppedEntry({ id: 'entry-1', durationSeconds: 3600 });
      const state: TimerState = {
        entries: [entry],
        activeEntryId: null,
        editingEntryId: 'entry-1',
        draft: {
          description: 'Work',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '09:30',
        },
      };

      const next = timerReducer(state, saveEditedEntry());

      expect(next.entries[0].durationSeconds).toBe(1800);
    });

    it('does nothing when editingEntryId is null', () => {
      const state = makeInitialState({ entries: [makeStoppedEntry()] });
      const next = timerReducer(state, saveEditedEntry());

      expect(next).toEqual(state);
    });

    it('clears editingEntryId and resets draft when target entry is not found', () => {
      const state: TimerState = {
        entries: [],
        activeEntryId: null,
        editingEntryId: 'missing-entry',
        draft: {
          description: 'x',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      };

      const next = timerReducer(state, saveEditedEntry());

      expect(next.editingEntryId).toBeNull();
    });

    it('does not edit a running entry', () => {
      const running = makeRunningEntry({ id: 'entry-active' });
      const state: TimerState = {
        entries: [running],
        activeEntryId: 'entry-active',
        editingEntryId: 'entry-active',
        draft: {
          description: 'Attempted edit',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: '2026-06-09',
          startTime: '09:00',
          endDate: '2026-06-09',
          endTime: '10:00',
        },
      };

      const next = timerReducer(state, saveEditedEntry());

      expect(next.entries[0].description).toBe('Running work');
      expect(next.editingEntryId).toBeNull();
    });
  });

  // ── cancelEditing ────────────────────────────────────────────────────────────

  describe('cancelEditing', () => {
    it('clears editingEntryId and resets draft', () => {
      const state: TimerState = {
        entries: [makeStoppedEntry()],
        activeEntryId: null,
        editingEntryId: 'entry-1',
        draft: {
          description: 'mid-edit description',
          project: 'Security Hardening',
          task: 'Audit remediation',
          billable: false,
          startDate: '2026-06-09',
          startTime: '08:00',
          endDate: '2026-06-09',
          endTime: '09:00',
        },
      };

      const next = timerReducer(state, cancelEditing());

      expect(next.editingEntryId).toBeNull();
      expect(next.draft.description).toBe('');
      expect(next.draft.project).toBe('Internal Operations');
    });
  });

  // ── resumeEntry ──────────────────────────────────────────────────────────────

  describe('resumeEntry', () => {
    it('creates a new running entry based on the source entry', () => {
      const source = makeStoppedEntry({
        id: 'entry-old',
        description: 'Continue this work',
        project: 'Security Hardening',
        task: 'Audit remediation',
        billable: false,
      });
      const state = makeInitialState({ entries: [source] });

      const next = timerReducer(state, resumeEntry({ entryId: 'entry-old' }));

      const newEntry = next.entries[0];
      expect(newEntry.id).not.toBe('entry-old');
      expect(newEntry.status).toBe('running');
      expect(newEntry.description).toBe('Continue this work');
      expect(newEntry.project).toBe('Security Hardening');
      expect(newEntry.durationSeconds).toBe(0);
      expect(newEntry.runningStartedAt).toBe(FIXED_NOW.toISOString());
      expect(next.activeEntryId).toBe(newEntry.id);
    });

    it('does not resume if another timer is already active', () => {
      const running = makeRunningEntry({ id: 'entry-active' });
      const stopped = makeStoppedEntry({ id: 'entry-stopped' });
      const state = makeInitialState({
        entries: [running, stopped],
        activeEntryId: 'entry-active',
      });

      const next = timerReducer(state, resumeEntry({ entryId: 'entry-stopped' }));

      expect(next.entries).toHaveLength(2);
      expect(next.activeEntryId).toBe('entry-active');
    });

    it('does nothing when the source entry is not found', () => {
      const state = makeInitialState({ entries: [makeStoppedEntry()] });

      const next = timerReducer(state, resumeEntry({ entryId: 'nonexistent' }));

      expect(next.entries).toHaveLength(1);
      expect(next.activeEntryId).toBeNull();
    });

    it('prepends the new entry ahead of the source entry', () => {
      const source = makeStoppedEntry({ id: 'entry-old' });
      const state = makeInitialState({ entries: [source] });

      const next = timerReducer(state, resumeEntry({ entryId: 'entry-old' }));

      expect(next.entries).toHaveLength(2);
      expect(next.entries[0].status).toBe('running');
      expect(next.entries[1].id).toBe('entry-old');
    });
  });
});
