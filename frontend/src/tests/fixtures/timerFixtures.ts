import type { TimerEntry, TimerDraft } from '@/store/slices/timer/timer.types';

export const makeStoppedEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-1',
  description: 'Sprint planning',
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

export const makeRunningEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-running',
  description: 'Active work session',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-06-09',
  startTime: '10:00',
  endDate: null,
  endTime: null,
  durationSeconds: 300,
  startedAt: '2026-06-09T10:00:00.000Z',
  endedAt: null,
  runningStartedAt: '2026-06-09T10:05:00.000Z',
  status: 'running',
  ...overrides,
});

export const makePausedEntry = (overrides: Partial<TimerEntry> = {}): TimerEntry => ({
  id: 'entry-paused',
  description: 'Paused session',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: false,
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

export const makeDefaultDraft = (overrides: Partial<TimerDraft> = {}): TimerDraft => ({
  description: '',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-06-09',
  startTime: '09:00',
  endDate: '2026-06-09',
  endTime: '10:00',
  ...overrides,
});