import { describe, it, expect } from 'vitest';

import { formatCompactDuration, formatDuration, getTimerElapsedSeconds } from './timerTime';
import type { TimerEntry } from '@/store/slices/timer/timer.types';

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

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats zero seconds as "00:00:00"', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only correctly', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(90)).toBe('00:01:30');
  });

  it('formats a full hour correctly', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
  });

  it('formats hours, minutes and seconds together', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats 24 hours correctly', () => {
    expect(formatDuration(86400)).toBe('24:00:00');
  });

  it('pads single-digit values with a leading zero', () => {
    expect(formatDuration(61)).toBe('00:01:01');
  });

  it('handles values larger than 99 hours', () => {
    expect(formatDuration(360000)).toBe('100:00:00');
  });

  it('formats 1 minute and 30 seconds', () => {
    expect(formatDuration(90)).toBe('00:01:30');
  });

  it('formats 59 minutes 59 seconds', () => {
    expect(formatDuration(3599)).toBe('00:59:59');
  });
});

// ─── getTimerElapsedSeconds ───────────────────────────────────────────────────

describe('getTimerElapsedSeconds', () => {
  it('returns durationSeconds for a stopped entry regardless of now', () => {
    const entry = makeEntry({ durationSeconds: 3600, status: 'stopped' });
    const now = new Date('2026-06-09T15:00:00.000Z').getTime();

    expect(getTimerElapsedSeconds(entry, now)).toBe(3600);
  });

  it('returns durationSeconds for a paused entry (no additional time added)', () => {
    const entry = makeEntry({ durationSeconds: 1800, status: 'paused', runningStartedAt: null });
    const now = new Date('2026-06-09T15:00:00.000Z').getTime();

    expect(getTimerElapsedSeconds(entry, now)).toBe(1800);
  });

  it('adds live elapsed time to durationSeconds for a running entry', () => {
    const runningStartedAt = '2026-06-09T10:00:00.000Z';
    const now = new Date('2026-06-09T10:05:00.000Z').getTime(); // 5 min later

    const entry = makeEntry({
      status: 'running',
      durationSeconds: 0,
      runningStartedAt,
    });

    expect(getTimerElapsedSeconds(entry, now)).toBe(300); // 5 min = 300s
  });

  it('accumulates previously elapsed seconds with live time for a resumed running entry', () => {
    const runningStartedAt = '2026-06-09T10:00:00.000Z';
    const now = new Date('2026-06-09T10:02:00.000Z').getTime(); // 2 min after resume

    const entry = makeEntry({
      status: 'running',
      durationSeconds: 600, // already had 10 min from before pause
      runningStartedAt,
    });

    // 600 existing + 120 new = 720
    expect(getTimerElapsedSeconds(entry, now)).toBe(720);
  });

  it('accepts a Date object as now parameter', () => {
    const runningStartedAt = '2026-06-09T10:00:00.000Z';
    const now = new Date('2026-06-09T10:01:00.000Z'); // 1 min later

    const entry = makeEntry({
      status: 'running',
      durationSeconds: 0,
      runningStartedAt,
    });

    expect(getTimerElapsedSeconds(entry, now)).toBe(60);
  });

  it('returns 0 and never goes negative even if now is before runningStartedAt', () => {
    const runningStartedAt = '2026-06-09T10:00:00.000Z';
    const now = new Date('2026-06-09T09:55:00.000Z').getTime(); // 5 min BEFORE

    const entry = makeEntry({
      status: 'running',
      durationSeconds: 0,
      runningStartedAt,
    });

    expect(getTimerElapsedSeconds(entry, now)).toBe(0);
  });

  it('returns durationSeconds for running entry when runningStartedAt is null/undefined', () => {
    const entry = makeEntry({
      status: 'running',
      durationSeconds: 120,
      runningStartedAt: null,
    });
    const now = Date.now();

    expect(getTimerElapsedSeconds(entry, now)).toBe(120);
  });

  it('returns 0 for a stopped entry with 0 durationSeconds', () => {
    const entry = makeEntry({ durationSeconds: 0, status: 'stopped' });
    expect(getTimerElapsedSeconds(entry, Date.now())).toBe(0);
  });
});

describe('formatCompactDuration', () => {
  it('formats hours and minutes compactly', () => {
    expect(formatCompactDuration(14520)).toBe('4h 02m');
  });

  it('formats minutes without seconds when under an hour', () => {
    expect(formatCompactDuration(2100)).toBe('35m');
  });

  it('formats zero as 0m', () => {
    expect(formatCompactDuration(0)).toBe('0m');
  });
});
