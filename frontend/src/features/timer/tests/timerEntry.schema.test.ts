import { describe, expect, it } from 'vitest';

import { validateTimerDraft } from '@/features/timer/validations';
import type { TimerDraft } from '@/store/slices/timer/timer.types';

const createDraft = (
  overrides: Partial<TimerDraft> = {}
): TimerDraft => ({
  description: 'Daily standup follow-up',
  project: 'Internal Operations',
  task: 'Standup and coordination',
  billable: true,
  startDate: '2026-05-25',
  startTime: '09:00',
  endDate: '2026-05-25',
  endTime: '10:00',
  ...overrides,
});

describe('validateTimerDraft', () => {
  it('returns no errors for a valid draft', () => {
    expect(validateTimerDraft(createDraft())).toEqual({});
  });

  it('returns required errors for empty project and task', () => {
    expect(
      validateTimerDraft(
        createDraft({
          project: '',
          task: '',
        })
      )
    ).toMatchObject({
      project: 'Required',
      task: 'Required',
    });
  });

  it('returns a range error when end time is before start time', () => {
    expect(
      validateTimerDraft(
        createDraft({
          startTime: '14:00',
          endTime: '13:30',
        })
      )
    ).toMatchObject({
      endTime: 'End time must be after start time',
    });
  });

  it('accepts a manual entry that spans multiple days', () => {
    expect(
      validateTimerDraft(
        createDraft({
          startDate: '2026-05-25',
          startTime: '23:00',
          endDate: '2026-05-26',
          endTime: '01:00',
        })
      )
    ).toEqual({});
  });
});
