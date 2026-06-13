import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { TimeEntryDetail } from '@/features/timer/types';
import {
  formatLocalDateKey,
  formatLocalTimeKey,
  getLocalDateKeyFromTimestamp,
  getLocalTimeKeyFromTimestamp,
} from '@/features/timer/utils';

import type {
  TimerDraft,
  TimerEntry,
  TimerState,
} from './timer.types';

const createTimeString = (date: Date) => formatLocalTimeKey(date);

const createDateString = (date: Date) => formatLocalDateKey(date);

const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

const toIsoTimestamp = (date: Date) => date.toISOString();

const getDatePart = (timestamp: string) =>
  getLocalDateKeyFromTimestamp(timestamp);

const getTimePart = (timestamp: string) =>
  getLocalTimeKeyFromTimestamp(timestamp);

const toTimerEntry = (entry: TimeEntryDetail): TimerEntry => ({
  id: entry.id,
  description: entry.workNote ?? '',
  project: entry.project.name,
  task: entry.task.name,
  billable: entry.isBillable,
  startDate: getDatePart(entry.startAt),
  startTime: getTimePart(entry.startAt),
  endDate: entry.endAt ? getDatePart(entry.endAt) : null,
  endTime: entry.endAt ? getTimePart(entry.endAt) : null,
  durationSeconds: entry.durationSeconds ?? 0,
  startedAt: entry.startAt,
  endedAt: entry.endAt,
  runningStartedAt:
    entry.status === 'running' ? entry.startAt : null,
  status: entry.status === 'running' ? 'running' : 'stopped',
});

const upsertTimerEntry = (entries: TimerEntry[], nextEntry: TimerEntry) => {
  const existingEntryIndex = entries.findIndex(
    (entry) => entry.id === nextEntry.id
  );

  if (existingEntryIndex >= 0) {
    entries.splice(existingEntryIndex, 1);
  }

  entries.unshift(nextEntry);
};

const calculateDurationSeconds = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
) => {
  const start = toDateTime(startDate, startTime);
  const end = toDateTime(endDate, endTime);

  return Math.max(
    Math.floor((end.getTime() - start.getTime()) / 1000),
    0
  );
};

const calculateTimestampDurationSeconds = (
  startTimestamp: string,
  endTimestamp: string
) =>
  Math.max(
    Math.floor(
      (new Date(endTimestamp).getTime() -
        new Date(startTimestamp).getTime()) /
        1000
    ),
    0
  );

const getTimerElapsedSecondsAt = (
  entry: TimerEntry,
  nowTimestamp: string
) =>
  Math.max(
    entry.durationSeconds +
      (entry.status === 'running' && entry.runningStartedAt
        ? calculateTimestampDurationSeconds(
            entry.runningStartedAt,
            nowTimestamp
          )
        : 0),
    0
  );

const calculateElapsedSecondsBetween = (
  startTimestamp: string,
  endTimestamp: string
) =>
  Math.max(
    Math.floor(
      (new Date(endTimestamp).getTime() -
        new Date(startTimestamp).getTime()) /
        1000
    ),
    0
  );

const syncStoppedEntryFromTimestamp = (
  entry: TimerEntry,
  nowTimestamp: string
) => {
  const now = new Date(nowTimestamp);
  const endDate = createDateString(now);
  const endTime = createTimeString(now);

  entry.status = 'stopped';
  entry.endDate = entry.endDate ?? endDate;
  entry.endTime = entry.endTime ?? endTime;
  entry.durationSeconds = getTimerElapsedSecondsAt(
    entry,
    nowTimestamp
  );
  entry.endedAt = entry.endedAt ?? nowTimestamp;
  entry.runningStartedAt = null;
};

const now = new Date();
const currentDate = createDateString(now);
const currentTime = createTimeString(now);

const createDefaultDraft = (): TimerDraft => ({
  description: '',
  project: '',
  task: '',
  billable: true,
  startDate: createDateString(new Date()),
  startTime: createTimeString(new Date()),
  endDate: createDateString(new Date()),
  endTime: createTimeString(new Date()),
});

const initialState: TimerState = {
  entries: [],
  draft: {
    ...createDefaultDraft(),
    startDate: currentDate,
    startTime: currentTime,
    endDate: currentDate,
    endTime: currentTime,
  },
  activeEntryId: null,
  editingEntryId: null,
};

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    updateDraft: (
      state,
      action: PayloadAction<Partial<TimerDraft>>
    ) => {
      state.draft = {
        ...state.draft,
        ...action.payload,
      };
    },

    clearDraft: (state) => {
      state.draft = createDefaultDraft();
      state.editingEntryId = null;
    },

    applyEntryToDraft: (
      state,
      action: PayloadAction<{ entryId: string }>
    ) => {
      const sourceEntry = state.entries.find(
        (entry) => entry.id === action.payload.entryId
      );

      if (!sourceEntry) {
        return;
      }

      state.draft = {
        ...state.draft,
        description: sourceEntry.description,
        project: sourceEntry.project,
        task: sourceEntry.task,
        billable: sourceEntry.billable,
        startDate: sourceEntry.startDate,
        startTime: sourceEntry.startTime,
        endDate: sourceEntry.endDate ?? sourceEntry.startDate,
        endTime: sourceEntry.endTime ?? state.draft.endTime,
      };
    },

    addManualEntry: (state) => {
      state.editingEntryId = null;
      const durationSeconds = calculateDurationSeconds(
        state.draft.startDate,
        state.draft.startTime,
        state.draft.endDate,
        state.draft.endTime
      );

      state.entries.unshift({
        id: `timer-entry-${Date.now()}`,
        description:
          state.draft.description,
        project: state.draft.project,
        task: state.draft.task,
        billable: state.draft.billable,
        startDate: state.draft.startDate,
        startTime: state.draft.startTime,
        endDate: state.draft.endDate,
        endTime: state.draft.endTime,
        durationSeconds,
        startedAt: toDateTime(
          state.draft.startDate,
          state.draft.startTime
        ).toISOString(),
        endedAt: toDateTime(
          state.draft.endDate,
          state.draft.endTime
        ).toISOString(),
        runningStartedAt: null,
        status: 'stopped',
      });

      state.draft = createDefaultDraft();
    },

    beginEditEntry: (
      state,
      action: PayloadAction<{ entryId: string }>
    ) => {
      const sourceEntry = state.entries.find(
        (entry) => entry.id === action.payload.entryId
      );

      if (!sourceEntry || sourceEntry.status === 'running') {
        return;
      }

      state.editingEntryId = sourceEntry.id;
      state.draft = {
        description: sourceEntry.description,
        project: sourceEntry.project,
        task: sourceEntry.task,
        billable: sourceEntry.billable,
        startDate: sourceEntry.startDate,
        startTime: sourceEntry.startTime,
        endDate: sourceEntry.endDate ?? sourceEntry.startDate,
        endTime: sourceEntry.endTime ?? sourceEntry.startTime,
      };
    },

    hydrateEntryForEditing: (
      state,
      action: PayloadAction<TimerEntry>
    ) => {
      const sourceEntry = action.payload;

      if (sourceEntry.status === 'running') {
        return;
      }

      state.editingEntryId = sourceEntry.id;
      state.draft = {
        description: sourceEntry.description,
        project: sourceEntry.project,
        task: sourceEntry.task,
        billable: sourceEntry.billable,
        startDate: sourceEntry.startDate,
        startTime: sourceEntry.startTime,
        endDate: sourceEntry.endDate ?? sourceEntry.startDate,
        endTime: sourceEntry.endTime ?? sourceEntry.startTime,
      };
    },

    saveEditedEntry: (state) => {
      if (!state.editingEntryId) {
        return;
      }

      const targetEntry = state.entries.find(
        (entry) => entry.id === state.editingEntryId
      );

      if (!targetEntry || targetEntry.status === 'running') {
        state.editingEntryId = null;
        return;
      }

      targetEntry.description =
        state.draft.description;
      targetEntry.project = state.draft.project;
      targetEntry.task = state.draft.task;
      targetEntry.billable = state.draft.billable;
      targetEntry.startDate = state.draft.startDate;
      targetEntry.startTime = state.draft.startTime;
      targetEntry.endDate = state.draft.endDate;
      targetEntry.endTime = state.draft.endTime;
      targetEntry.durationSeconds = calculateDurationSeconds(
        state.draft.startDate,
        state.draft.startTime,
        state.draft.endDate,
        state.draft.endTime
      );
      targetEntry.startedAt = toDateTime(
        state.draft.startDate,
        state.draft.startTime
      ).toISOString();
      targetEntry.endedAt = toDateTime(
        state.draft.endDate,
        state.draft.endTime
      ).toISOString();
      targetEntry.runningStartedAt = null;

      state.editingEntryId = null;
      state.draft = createDefaultDraft();
    },

    cancelEditing: (state) => {
      state.editingEntryId = null;
      state.draft = createDefaultDraft();
    },

    startTimer: (state) => {
      if (state.activeEntryId) {
        return;
      }

      const start = new Date();
      const startTime = createTimeString(start);
      const date = createDateString(start);
      const startedAt = toIsoTimestamp(start);
      const entryId = `timer-entry-${Date.now()}`;

      state.entries.unshift({
        id: entryId,
        description:
          state.draft.description,
        project: state.draft.project,
        task: state.draft.task,
        billable: state.draft.billable,
        startDate: date,
        startTime,
        endDate: null,
        endTime: null,
        durationSeconds: 0,
        startedAt,
        endedAt: null,
        runningStartedAt: startedAt,
        status: 'running',
      });

      state.activeEntryId = entryId;
      state.editingEntryId = null;
      state.draft = {
        ...state.draft,
        startDate: date,
        startTime,
        endDate: date,
        endTime: startTime,
      };
    },

    hydrateStartedTimer: (
      state,
      action: PayloadAction<TimeEntryDetail>
    ) => {
      const nextEntry = toTimerEntry(action.payload);
      upsertTimerEntry(state.entries, nextEntry);
      state.activeEntryId = nextEntry.id;
      state.editingEntryId = null;
      state.draft = {
        ...state.draft,
        description: nextEntry.description,
        project: nextEntry.project,
        task: nextEntry.task,
        billable: nextEntry.billable,
        startDate: nextEntry.startDate,
        startTime: nextEntry.startTime,
        endDate: nextEntry.startDate,
        endTime: nextEntry.startTime,
      };
    },

    hydratePausedTimer: (
      state,
      action: PayloadAction<TimeEntryDetail>
    ) => {
      const nextEntry = {
        ...toTimerEntry(action.payload),
        status: 'paused' as const,
        runningStartedAt: null,
      };
      upsertTimerEntry(state.entries, nextEntry);
      state.activeEntryId = nextEntry.id;
    },

    hydrateResumedTimer: (
      state,
      action: PayloadAction<
        | TimeEntryDetail
        | {
            entry: TimeEntryDetail;
            resumedAt: string;
          }
      >
    ) => {
      const sourceEntry =
        'entry' in action.payload
          ? action.payload.entry
          : action.payload;
      const resumedAt =
        'entry' in action.payload
          ? action.payload.resumedAt
          : toIsoTimestamp(new Date());
      const resumedDurationSeconds =
        sourceEntry.startAt
          ? calculateElapsedSecondsBetween(
              sourceEntry.startAt,
              resumedAt
            )
          : 0;
      const nextEntry = {
        ...toTimerEntry(sourceEntry),
        status: 'running' as const,
        durationSeconds: resumedDurationSeconds,
        runningStartedAt: resumedAt,
      };
      upsertTimerEntry(state.entries, nextEntry);
      state.activeEntryId = nextEntry.id;
    },

    hydrateStoppedTimer: (
      state,
      action: PayloadAction<{
        entry: TimeEntryDetail;
        billable?: boolean;
        notes?: string;
      }>
    ) => {
      const nextEntry = toTimerEntry(action.payload.entry);
      const nextNotes = action.payload.notes?.trim();

      if (typeof action.payload.billable === 'boolean') {
        nextEntry.billable = action.payload.billable;
      }

      if (nextNotes) {
        nextEntry.description = nextNotes;
      }

      upsertTimerEntry(state.entries, nextEntry);
      state.activeEntryId = null;
      state.editingEntryId = null;
      state.draft = {
        ...createDefaultDraft(),
        description: nextEntry.description,
        project: nextEntry.project,
        task: nextEntry.task,
        billable: nextEntry.billable,
      };
    },

    hydratePersistedStoppedEntry: (
      state,
      action: PayloadAction<TimeEntryDetail>
    ) => {
      upsertTimerEntry(state.entries, toTimerEntry(action.payload));
      state.editingEntryId = null;
      state.draft = createDefaultDraft();
    },

    pauseTimer: (
      state,
      action: PayloadAction<{ elapsedSeconds?: number } | undefined>
    ) => {
      if (!state.activeEntryId) {
        return;
      }

      const now = new Date();
      const currentDate = createDateString(now);
      const currentTime = createTimeString(now);
      const currentTimestamp = toIsoTimestamp(now);
      const activeEntry = state.entries.find(
        (entry) => entry.id === state.activeEntryId
      );

      if (
        !activeEntry ||
        activeEntry.status !== 'running' ||
        !activeEntry.runningStartedAt
      ) {
        return;
      }

      const elapsedSeconds = getTimerElapsedSecondsAt(
        activeEntry,
        currentTimestamp
      );
      activeEntry.durationSeconds = Math.max(
        elapsedSeconds,
        action.payload?.elapsedSeconds ?? 0
      );
      activeEntry.status = 'paused';
      activeEntry.endDate = currentDate;
      activeEntry.endTime = currentTime;
      activeEntry.endedAt = currentTimestamp;
      activeEntry.runningStartedAt = null;
    },

    resumePausedTimer: (state) => {
      if (!state.activeEntryId) {
        return;
      }

      const now = new Date();
      const currentTimestamp = toIsoTimestamp(now);
      const activeEntry = state.entries.find(
        (entry) => entry.id === state.activeEntryId
      );

      if (!activeEntry || activeEntry.status !== 'paused') {
        return;
      }

      activeEntry.status = 'running';
      activeEntry.endDate = null;
      activeEntry.endTime = null;
      activeEntry.endedAt = null;
      activeEntry.runningStartedAt = currentTimestamp;
    },

    stopTimer: (
      state,
      action: PayloadAction<
        | {
            billable?: boolean;
            notes?: string;
          }
        | undefined
      >
    ) => {
      if (!state.activeEntryId) {
        return;
      }

      const end = new Date();
      const endDate = createDateString(end);
      const endTime = createTimeString(end);
      const endedAt = toIsoTimestamp(end);
      const activeEntry = state.entries.find(
        (entry) => entry.id === state.activeEntryId
      );

      if (!activeEntry) {
        state.activeEntryId = null;
        return;
      }

      const nextDescription = action.payload?.notes?.trim();
      if (typeof action.payload?.billable === 'boolean') {
        activeEntry.billable = action.payload.billable;
      }
      if (nextDescription) {
        activeEntry.description = nextDescription;
      }

      activeEntry.status = 'stopped';
      activeEntry.endDate = endDate;
      activeEntry.endTime = endTime;
      activeEntry.durationSeconds = getTimerElapsedSecondsAt(
        activeEntry,
        endedAt
      );
      if (!activeEntry.startedAt) {
        activeEntry.startedAt = toDateTime(
          activeEntry.startDate,
          activeEntry.startTime
        ).toISOString();
      }
      activeEntry.endedAt = endedAt;
      activeEntry.runningStartedAt = null;
      if (
        activeEntry.durationSeconds === 0 &&
        activeEntry.startedAt &&
        activeEntry.endedAt
      ) {
        activeEntry.durationSeconds = calculateTimestampDurationSeconds(
          activeEntry.startedAt,
          activeEntry.endedAt
        );
      }
      state.activeEntryId = null;
      state.draft = {
        ...createDefaultDraft(),
        description: activeEntry.description,
        project: activeEntry.project,
        task: activeEntry.task,
        billable: activeEntry.billable,
      };
    },

    clearSynchronizedActiveTimer: (state) => {
      if (!state.activeEntryId) {
        return;
      }

      const activeEntry = state.entries.find(
        (entry) => entry.id === state.activeEntryId
      );

      if (activeEntry) {
        syncStoppedEntryFromTimestamp(
          activeEntry,
          toIsoTimestamp(new Date())
        );
      }

      state.activeEntryId = null;
      state.editingEntryId = null;
    },

    resumeEntry: (
      state,
      action: PayloadAction<{ entryId: string }>
    ) => {
      if (state.activeEntryId) {
        return;
      }

      const sourceEntry = state.entries.find(
        (entry) => entry.id === action.payload.entryId
      );

      if (!sourceEntry) {
        return;
      }

      const nowDate = new Date();
      const newStartTime = createTimeString(nowDate);
      const newDate = createDateString(nowDate);
      const startedAt = toIsoTimestamp(nowDate);
      const newEntryId = `timer-entry-${Date.now()}`;

      state.entries.unshift({
        ...sourceEntry,
        id: newEntryId,
        startDate: newDate,
        startTime: newStartTime,
        endDate: null,
        endTime: null,
        durationSeconds: 0,
        startedAt,
        endedAt: null,
        runningStartedAt: startedAt,
        status: 'running',
      });

      state.activeEntryId = newEntryId;
      state.draft = {
        ...state.draft,
        description: sourceEntry.description,
        project: sourceEntry.project,
        task: sourceEntry.task,
        billable: sourceEntry.billable,
        startDate: newDate,
        startTime: newStartTime,
        endDate: newDate,
        endTime: newStartTime,
      };
    },
  },
});

export const {
  updateDraft,
  clearDraft,
  applyEntryToDraft,
  addManualEntry,
  beginEditEntry,
  hydrateEntryForEditing,
  hydratePersistedStoppedEntry,
  saveEditedEntry,
  cancelEditing,
  startTimer,
  hydrateStartedTimer,
  hydratePausedTimer,
  hydrateResumedTimer,
  hydrateStoppedTimer,
  pauseTimer,
  clearSynchronizedActiveTimer,
  resumePausedTimer,
  stopTimer,
  resumeEntry,
} = timerSlice.actions;

export default timerSlice.reducer;
