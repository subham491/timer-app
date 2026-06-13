import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  selectActiveTimerEntry,
  selectTimerEntriesByDay,
  selectWeeklyTotalSeconds,
} from './timerSelectors';
import type { TimerEntry, TimerState } from './timer.types';
import type { RootState } from '@/store/store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-1',
  description: 'Test',
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

const makeTimerState = (overrides: Partial<TimerState> = {}): TimerState => ({
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

// Minimal RootState shape sufficient for timer selectors
const rootState = (timer: TimerState): RootState =>
  ({ timer } as unknown as RootState);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('timerSelectors', () => {
  // ── selectActiveTimerEntry ──────────────────────────────────────────────────

  describe('selectActiveTimerEntry', () => {
    it('returns null when no active entry id is set', () => {
      const state = rootState(makeTimerState({ entries: [makeEntry()] }));
      expect(selectActiveTimerEntry(state)).toBeNull();
    });

    it('returns the matching entry when activeEntryId is set', () => {
      const entry = makeEntry({ id: 'entry-active', status: 'running' });
      const state = rootState(
        makeTimerState({ entries: [entry], activeEntryId: 'entry-active' })
      );

      expect(selectActiveTimerEntry(state)?.id).toBe('entry-active');
    });

    it('returns null when activeEntryId points to a missing entry', () => {
      const state = rootState(
        makeTimerState({ entries: [makeEntry()], activeEntryId: 'ghost-entry' })
      );

      expect(selectActiveTimerEntry(state)).toBeNull();
    });

    it('returns the correct entry when multiple entries exist', () => {
      const entry1 = makeEntry({ id: 'entry-1', status: 'stopped' });
      const entry2 = makeEntry({ id: 'entry-2', status: 'running' });
      const state = rootState(
        makeTimerState({ entries: [entry1, entry2], activeEntryId: 'entry-2' })
      );

      expect(selectActiveTimerEntry(state)?.id).toBe('entry-2');
    });
  });

  // ── selectWeeklyTotalSeconds ────────────────────────────────────────────────

  describe('selectWeeklyTotalSeconds', () => {
    it('returns 0 when there are no entries', () => {
      const state = rootState(makeTimerState());
      expect(selectWeeklyTotalSeconds(state)).toBe(0);
    });

    it('sums durationSeconds across all entries', () => {
      const entries = [
        makeEntry({ id: 'e1', durationSeconds: 3600 }),
        makeEntry({ id: 'e2', durationSeconds: 1800 }),
        makeEntry({ id: 'e3', durationSeconds: 900 }),
      ];
      const state = rootState(makeTimerState({ entries }));

      expect(selectWeeklyTotalSeconds(state)).toBe(6300);
    });

    it('returns the correct total for a single entry', () => {
      const state = rootState(
        makeTimerState({ entries: [makeEntry({ durationSeconds: 7200 })] })
      );
      expect(selectWeeklyTotalSeconds(state)).toBe(7200);
    });

    it('includes running entries by their stored durationSeconds', () => {
      // selector sums durationSeconds as-is; live elapsed is handled in the hook
      const entries = [
        makeEntry({ id: 'e1', durationSeconds: 0, status: 'running' }),
        makeEntry({ id: 'e2', durationSeconds: 1800, status: 'stopped' }),
      ];
      const state = rootState(makeTimerState({ entries }));

      expect(selectWeeklyTotalSeconds(state)).toBe(1800);
    });
  });

  // ── selectTimerEntriesByDay ─────────────────────────────────────────────────

  describe('selectTimerEntriesByDay', () => {
    const TODAY = new Date('2026-06-09T12:00:00.000Z');
    const YESTERDAY_DATE = '2026-06-08';
    const TODAY_DATE = '2026-06-09';
    const OLDER_DATE = '2026-06-07';

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(TODAY);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns an empty array when there are no entries', () => {
      const state = rootState(makeTimerState());
      expect(selectTimerEntriesByDay(state)).toEqual([]);
    });

    it('groups entries by startDate', () => {
      const entries = [
        makeEntry({ id: 'e1', startDate: TODAY_DATE }),
        makeEntry({ id: 'e2', startDate: TODAY_DATE }),
        makeEntry({ id: 'e3', startDate: YESTERDAY_DATE }),
      ];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      expect(groups).toHaveLength(2);
      const todayGroup = groups.find((g) => g.date === TODAY_DATE)!;
      expect(todayGroup.entries).toHaveLength(2);
    });

    it('sorts groups in descending date order (most recent first)', () => {
      const entries = [
        makeEntry({ id: 'e1', startDate: OLDER_DATE }),
        makeEntry({ id: 'e2', startDate: TODAY_DATE }),
        makeEntry({ id: 'e3', startDate: YESTERDAY_DATE }),
      ];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      expect(groups[0].date).toBe(TODAY_DATE);
      expect(groups[1].date).toBe(YESTERDAY_DATE);
      expect(groups[2].date).toBe(OLDER_DATE);
    });

    it('sums totalSeconds per group', () => {
      const entries = [
        makeEntry({ id: 'e1', startDate: TODAY_DATE, durationSeconds: 1800 }),
        makeEntry({ id: 'e2', startDate: TODAY_DATE, durationSeconds: 900 }),
        makeEntry({ id: 'e3', startDate: YESTERDAY_DATE, durationSeconds: 3600 }),
      ];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      const todayGroup = groups.find((g) => g.date === TODAY_DATE)!;
      expect(todayGroup.totalSeconds).toBe(2700);

      const yesterdayGroup = groups.find((g) => g.date === YESTERDAY_DATE)!;
      expect(yesterdayGroup.totalSeconds).toBe(3600);
    });

    it('labels today\'s group as "Today"', () => {
      const entries = [makeEntry({ id: 'e1', startDate: TODAY_DATE })];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      expect(groups[0].label).toBe('Today');
    });

    it('labels yesterday\'s group as "Yesterday"', () => {
      const entries = [makeEntry({ id: 'e1', startDate: YESTERDAY_DATE })];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      expect(groups[0].label).toBe('Yesterday');
    });

    it('labels older dates as a formatted date string', () => {
      const entries = [makeEntry({ id: 'e1', startDate: OLDER_DATE })];
      const state = rootState(makeTimerState({ entries }));

      const groups = selectTimerEntriesByDay(state);

      // Should be a human readable string like "Sunday, Jun 7" — not "Today"/"Yesterday"
      expect(groups[0].label).not.toBe('Today');
      expect(groups[0].label).not.toBe('Yesterday');
      expect(typeof groups[0].label).toBe('string');
      expect(groups[0].label.length).toBeGreaterThan(0);
    });
  });
});