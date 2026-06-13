import { createSelector } from '@reduxjs/toolkit';

import { formatRelativeDateLabel } from '@/features/timer/utils';
import type { RootState } from '@/store/store';

export const selectTimerState = (state: RootState) => state.timer;

export const selectTimerEntries = createSelector(
  [selectTimerState],
  (timer) => timer.entries
);

export const selectTimerDraft = createSelector(
  [selectTimerState],
  (timer) => timer.draft
);

export const selectActiveTimerId = createSelector(
  [selectTimerState],
  (timer) => timer.activeEntryId
);

export const selectEditingEntryId = createSelector(
  [selectTimerState],
  (timer) => timer.editingEntryId
);

export const selectActiveTimerEntry = createSelector(
  [selectTimerEntries, selectActiveTimerId],
  (entries, activeEntryId) =>
    entries.find((entry) => entry.id === activeEntryId) ?? null
);

export const selectWeeklyTotalSeconds = createSelector(
  [selectTimerEntries],
  (entries) =>
    entries.reduce(
      (total, entry) => total + entry.durationSeconds,
      0
    )
);

export const selectTimerEntriesByDay = createSelector(
  [selectTimerEntries],
  (entries) => {
    const grouped = entries.reduce<
      Record<
        string,
        {
          date: string;
          label: string;
          totalSeconds: number;
          entries: typeof entries;
        }
      >
    >((accumulator, entry) => {
      if (!accumulator[entry.startDate]) {
        accumulator[entry.startDate] = {
          date: entry.startDate,
          label: formatRelativeDateLabel(entry.startDate),
          totalSeconds: 0,
          entries: [],
        };
      }

      accumulator[entry.startDate].entries.push(entry);
      accumulator[entry.startDate].totalSeconds +=
        entry.durationSeconds;

      return accumulator;
    }, {});

    return Object.values(grouped).sort((first, second) =>
      second.date.localeCompare(first.date)
    );
  }
);
