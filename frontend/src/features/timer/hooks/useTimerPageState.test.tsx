import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getTheme } from '@/app/theme';
import { useTimerPageState } from '@/features/timer/hooks';
import rootReducer from '@/store/rootReducer';
import type { RootState } from '@/store/store';
import type { TimerEntry, TimerState } from '@/store/slices/timer/timer.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = '2026-06-09';
const FIXED_NOW = new Date(`${TODAY}T10:00:00.000Z`);

const makeStoppedEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: `entry-${Math.random()}`,
  description: 'Default work',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: TODAY,
  startTime: '09:00',
  endDate: TODAY,
  endTime: '10:00',
  durationSeconds: 3600,
  startedAt: `${TODAY}T09:00:00.000Z`,
  endedAt: `${TODAY}T10:00:00.000Z`,
  runningStartedAt: null,
  status: 'stopped',
  ...overrides,
});

const makeRunningEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-running',
  description: 'Active task',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: TODAY,
  startTime: '09:00',
  endDate: null,
  endTime: null,
  durationSeconds: 0,
  startedAt: `${TODAY}T09:00:00.000Z`,
  endedAt: null,
  runningStartedAt: FIXED_NOW.toISOString(),
  status: 'running',
  ...overrides,
});

const createStore = (timerOverrides: Partial<TimerState> = {}) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      timer: {
        entries: [],
        activeEntryId: null,
        editingEntryId: null,
        draft: {
          description: '',
          project: 'Internal Operations',
          task: 'Standup and coordination',
          billable: true,
          startDate: TODAY,
          startTime: '09:00',
          endDate: TODAY,
          endTime: '09:00',
        },
        ...timerOverrides,
      },
    } as Partial<RootState>,
  });

const makeWrapper = (store: ReturnType<typeof createStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider theme={getTheme('light')}>
          <MemoryRouter>{children}</MemoryRouter>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTimerPageState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns null activeEntry when no timer is running', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.activeEntry).toBeNull();
    });

    it('returns "timer" as default entryMode', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.entryMode).toBe('timer');
    });

    it('returns empty searchText initially', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.searchText).toBe('');
    });

    it('returns empty projectFilters and taskFilters initially', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.projectFilters).toEqual([]);
      expect(result.current.taskFilters).toEqual([]);
    });

    it('returns no fallback project options before timer context loads', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.projectOptions).toEqual([]);
    });

    it('uses only timer context options after query load', async () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.projectOptions).toEqual([]);

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.projectOptions).toContain('Seat Booking Rollout');
      expect(result.current.projectOptions).not.toContain('Pulse Mobile Revamp');
      expect(result.current.taskOptions).toEqual([
        'Standup and coordination',
        'Internal review queue',
      ]);
    });
  });

  // ── activeEntry ─────────────────────────────────────────────────────────────

  describe('activeEntry', () => {
    it('returns the active entry when a timer is running', () => {
      const running = makeRunningEntry({ id: 'active-1' });
      const store = createStore({
        entries: [running],
        activeEntryId: 'active-1',
      });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.activeEntry?.id).toBe('active-1');
      expect(result.current.activeEntry?.status).toBe('running');
    });

    it('exposes durationSeconds on the active entry', () => {
      const running = makeRunningEntry({
        id: 'active-1',
        durationSeconds: 300,
        runningStartedAt: new Date(FIXED_NOW.getTime() - 60_000).toISOString(),
      });
      const store = createStore({ entries: [running], activeEntryId: 'active-1' });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      // 300 stored + ~60 live = at least 360
      expect(result.current.activeEntry?.durationSeconds).toBeGreaterThanOrEqual(360);
    });
  });

  // ── filteredDayGroups ───────────────────────────────────────────────────────

  describe('filteredDayGroups', () => {
    it('returns all entries when no filters are applied', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', description: 'Task A' }),
        makeStoppedEntry({ id: 'e2', description: 'Task B' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      const allEntries = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(allEntries).toHaveLength(2);
    });

    it('filters entries by search text (description match)', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', description: 'Sprint review' }),
        makeStoppedEntry({ id: 'e2', description: 'Security audit' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSearchTextChange('sprint');
      });

      const filtered = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Sprint review');
    });

    it('search is case-insensitive', () => {
      const entries = [makeStoppedEntry({ id: 'e1', description: 'Sprint Review' })];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSearchTextChange('SPRINT');
      });

      const filtered = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(filtered).toHaveLength(1);
    });

    it('filters entries by project filter', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', project: 'Security Hardening' }),
        makeStoppedEntry({ id: 'e2', project: 'Internal Operations' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onProjectFiltersChange(['Security Hardening']);
      });

      const filtered = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].project).toBe('Security Hardening');
    });

    it('filters entries by task filter', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', task: 'Bug fixing' }),
        makeStoppedEntry({ id: 'e2', task: 'Documentation' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onTaskFiltersChange(['Bug fixing']);
      });

      const filtered = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].task).toBe('Bug fixing');
    });

    it('returns empty filteredDayGroups when no entries match search', () => {
      const entries = [makeStoppedEntry({ id: 'e1', description: 'Team sync' })];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSearchTextChange('xyzxyz');
      });

      expect(result.current.filteredDayGroups).toHaveLength(0);
    });

    it('combines search and project filters (AND logic)', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', description: 'Sprint', project: 'Security Hardening' }),
        makeStoppedEntry({ id: 'e2', description: 'Sprint', project: 'Internal Operations' }),
        makeStoppedEntry({ id: 'e3', description: 'Other', project: 'Security Hardening' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSearchTextChange('sprint');
        result.current.onProjectFiltersChange(['Security Hardening']);
      });

      const filtered = result.current.filteredDayGroups.flatMap((g) => g.entries);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('e1');
    });

    it('groups entries by day correctly', () => {
      const yesterday = new Date(FIXED_NOW.getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
      const entries = [
        makeStoppedEntry({ id: 'e1', startDate: TODAY }),
        makeStoppedEntry({ id: 'e2', startDate: TODAY }),
        makeStoppedEntry({ id: 'e3', startDate: yesterday }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.filteredDayGroups).toHaveLength(2);
      const todayGroup = result.current.filteredDayGroups.find(
        (g) => g.label === 'Today'
      );
      expect(todayGroup?.entries).toHaveLength(2);
    });
  });

  // ── todayTotalSeconds / weekTotalSeconds ─────────────────────────────────────

  describe('totals', () => {
    it('returns 0 for todayTotalSeconds when there are no today entries', () => {
      const yesterday = new Date(FIXED_NOW.getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
      const store = createStore({
        entries: [makeStoppedEntry({ startDate: yesterday })],
      });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.todayTotalSeconds).toBe(0);
    });

    it('sums today entries for todayTotalSeconds', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', startDate: TODAY, durationSeconds: 3600 }),
        makeStoppedEntry({ id: 'e2', startDate: TODAY, durationSeconds: 1800 }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.todayTotalSeconds).toBe(5400);
    });

    it('sums all entries for weekTotalSeconds', () => {
      const yesterday = new Date(FIXED_NOW.getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
      const entries = [
        makeStoppedEntry({ id: 'e1', startDate: TODAY, durationSeconds: 3600 }),
        makeStoppedEntry({ id: 'e2', startDate: yesterday, durationSeconds: 7200 }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      expect(result.current.weekTotalSeconds).toBeGreaterThanOrEqual(10800);
    });
  });

  // ── onModeChange ────────────────────────────────────────────────────────────

  describe('onModeChange', () => {
    it('switches entryMode to "manual"', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onModeChange('manual');
      });

      expect(result.current.entryMode).toBe('manual');
    });

    it('switches entryMode back to "timer"', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onModeChange('manual');
        result.current.onModeChange('timer');
      });

      expect(result.current.entryMode).toBe('timer');
    });
  });

  // ── dispatch actions ────────────────────────────────────────────────────────

  describe('onStartOrStopTimer', () => {
    it('starts a timer when no active entry exists', () => {
      const store = createStore();
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onStartOrStopTimer();
      });

      expect(store.getState().timer.activeEntryId).not.toBeNull();
    });

    it('stops the active timer when called with an active entry', () => {
      const running = makeRunningEntry({ id: 'active-1' });
      const store = createStore({ entries: [running], activeEntryId: 'active-1' });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onStartOrStopTimer();
      });

      expect(store.getState().timer.activeEntryId).toBeNull();
    });

    it('stops timer with billable and notes payload', () => {
      const running = makeRunningEntry({ id: 'active-1' });
      const store = createStore({ entries: [running], activeEntryId: 'active-1' });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onStartOrStopTimer({ billable: false, notes: 'Completed sprint' });
      });

      const stopped = store.getState().timer.entries[0];
      expect(stopped.billable).toBe(false);
      expect(stopped.description).toBe('Completed sprint');
    });
  });

  describe('onEditEntry', () => {
    it('sets editingEntryId in the store', () => {
      const entry = makeStoppedEntry({ id: 'entry-edit' });
      const store = createStore({ entries: [entry] });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onEditEntry('entry-edit');
      });

      expect(store.getState().timer.editingEntryId).toBe('entry-edit');
    });
  });

  describe('onSaveManualEntry', () => {
    it('adds an entry to the store when draft is valid', () => {
      const store = createStore();
      // Set a valid draft via the store directly
      store.dispatch({
        type: 'timer/updateDraft',
        payload: {
          project: 'Internal Operations',
          task: 'Standup and coordination',
          startDate: TODAY,
          startTime: '09:00',
          endDate: TODAY,
          endTime: '10:00',
        },
      });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSaveManualEntry();
      });

      expect(store.getState().timer.entries.length).toBeGreaterThan(0);
    });

    it('does not add entry when draft fails validation', () => {
      const store = createStore();
      store.dispatch({ type: 'timer/updateDraft', payload: { project: '' } });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      act(() => {
        result.current.onSaveManualEntry();
      });

      expect(store.getState().timer.entries).toHaveLength(0);
    });
  });

  // ── allProjects / allTasks ──────────────────────────────────────────────────

  describe('allProjects and allTasks', () => {
    it('returns unique projects from entries', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', project: 'Security Hardening' }),
        makeStoppedEntry({ id: 'e2', project: 'Security Hardening' }), // duplicate
        makeStoppedEntry({ id: 'e3', project: 'Pulse Mobile Revamp' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      const projects = result.current.allProjects;
      const unique = new Set(projects);
      expect(unique.size).toBe(projects.length); // no duplicates
      expect(projects).toContain('Security Hardening');
      expect(projects).toContain('Pulse Mobile Revamp');
    });

    it('returns unique tasks from entries', () => {
      const entries = [
        makeStoppedEntry({ id: 'e1', task: 'Bug fixing' }),
        makeStoppedEntry({ id: 'e2', task: 'Bug fixing' }), // duplicate
        makeStoppedEntry({ id: 'e3', task: 'Documentation' }),
      ];
      const store = createStore({ entries });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      const tasks = result.current.allTasks;
      const unique = new Set(tasks);
      expect(unique.size).toBe(tasks.length);
      expect(tasks).toContain('Bug fixing');
      expect(tasks).toContain('Documentation');
    });
  });

  // ── editingEntryId auto-switches mode ────────────────────────────────────────

  describe('editingEntryId side effect', () => {
    it('switches entryMode to "manual" when editingEntryId is set in store', async () => {
      const entry = makeStoppedEntry({ id: 'e-edit' });
      const store = createStore({ entries: [entry], editingEntryId: 'e-edit' });
      const { result } = renderHook(() => useTimerPageState(), {
        wrapper: makeWrapper(store),
      });

      // useEffect fires after mount — flush with act then check
      await act(async () => {});
      expect(result.current.entryMode).toBe('manual');
    });
  });
});
