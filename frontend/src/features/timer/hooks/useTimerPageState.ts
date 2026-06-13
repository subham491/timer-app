import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';
import type {
  EntryMode,
  UseTimerPageStateResult,
} from '@/features/timer/types';
import { usePauseTimerMutation } from '@/features/timer/hooks/usePauseTimerMutation';
import { useCurrentTimerQuery } from '@/features/timer/hooks/useCurrentTimerQuery';
import { useResumeTimerMutation } from '@/features/timer/hooks/useResumeTimerMutation';
import { useStartTimerMutation } from '@/features/timer/hooks/useStartTimerMutation';
import { useStopTimerMutation } from '@/features/timer/hooks/useStopTimerMutation';
import { useTimeEntriesQuery } from '@/features/timer/hooks/useTimeEntriesQuery';
import { timerKeys, useTimerContextQuery } from '@/features/timer/hooks/useTimerContextQuery';
import {
  formatLocalDateKey,
  formatRelativeDateLabel,
  getLocalDateKeyFromTimestamp,
  getLocalTimeKeyFromTimestamp,
} from '@/features/timer/utils';
import { getTimerElapsedSeconds } from '@/features/timer/utils/timerTime';
import { validateTimerDraft } from '@/features/timer/validations';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  cancelEditing,
  clearDraft,
  hydrateEntryForEditing,
  hydratePausedTimer,
  hydratePersistedStoppedEntry,
  hydrateResumedTimer,
  hydrateStartedTimer,
  hydrateStoppedTimer,
  resumeEntry,
  updateDraft,
} from '@/store/slices/timer/timerSlice';
import {
  selectActiveTimerEntry,
  selectEditingEntryId,
  selectTimerDraft,
} from '@/store/slices/timer/timerSelectors';
import type {
  TimerDraft,
  TimerEntry,
} from '@/store/slices/timer/timer.types';
import type { TimerPageGroup } from '@/features/timer/types/timerPage.types';

const MAX_SECONDS_PER_DAY = 24 * 60 * 60;

const toRecentWorkEntry = (
  entry: {
    durationSeconds: number | null;
    endAt: string | null;
    id: string;
    isBillable: boolean;
    project: { name: string };
    startAt: string;
    status: 'running' | 'stopped';
    task: { name: string };
    workNote: string | null;
  }
): TimerEntry => ({
  id: entry.id,
  description: entry.workNote ?? '',
  project: entry.project.name,
  task: entry.task.name,
  billable: entry.isBillable,
  startDate: getLocalDateKeyFromTimestamp(entry.startAt),
  startTime: getLocalTimeKeyFromTimestamp(entry.startAt),
  endDate: entry.endAt ? getLocalDateKeyFromTimestamp(entry.endAt) : null,
  endTime: entry.endAt ? getLocalTimeKeyFromTimestamp(entry.endAt) : null,
  durationSeconds: entry.durationSeconds ?? 0,
  startedAt: entry.startAt,
  endedAt: entry.endAt,
  runningStartedAt: null,
  status: entry.status === 'running' ? 'running' : 'stopped',
});

const toDraftDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

const getNextLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1);

const getStartOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const buildDailySecondsMap = (startAt: Date, endAt: Date) => {
  const dailySeconds = new Map<string, number>();
  let cursor = new Date(startAt);

  while (cursor < endAt) {
    const nextDay = getNextLocalDay(cursor);
    const segmentEnd = nextDay < endAt ? nextDay : endAt;
    const dayKey = formatLocalDateKey(cursor);
    const seconds = Math.max(
      Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000),
      0
    );

    dailySeconds.set(dayKey, (dailySeconds.get(dayKey) ?? 0) + seconds);
    cursor = segmentEnd;
  }

  return dailySeconds;
};

const getManualDayLimitError = (
  entries: TimerEntry[],
  draft: TimerDraft,
  editingEntryId: string | null
) => {
  const candidateStart = toDraftDateTime(draft.startDate, draft.startTime);
  const candidateEnd = toDraftDateTime(draft.endDate, draft.endTime);

  if (candidateEnd <= candidateStart) {
    return null;
  }

  const dailyTotals = buildDailySecondsMap(candidateStart, candidateEnd);
  const dayWindowStart = getStartOfLocalDay(candidateStart);
  const dayWindowEnd = getNextLocalDay(getStartOfLocalDay(candidateEnd));

  for (const entry of entries) {
    if (
      entry.id === editingEntryId ||
      entry.status !== 'stopped' ||
      !entry.endDate ||
      !entry.endTime
    ) {
      continue;
    }

    const entryStart = toDraftDateTime(entry.startDate, entry.startTime);
    const entryEnd = toDraftDateTime(entry.endDate, entry.endTime);

    if (entryEnd <= dayWindowStart || entryStart >= dayWindowEnd) {
      continue;
    }

    for (const [dayKey, seconds] of buildDailySecondsMap(entryStart, entryEnd)) {
      if (!dailyTotals.has(dayKey)) {
        continue;
      }

      dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + seconds);
    }
  }

  for (const [dayKey, seconds] of dailyTotals) {
    if (seconds > MAX_SECONDS_PER_DAY) {
      return `Manual time for ${dayKey} cannot exceed 24 hours.`;
    }
  }

  return null;
};

export const useTimerPageState = (): UseTimerPageStateResult => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const pauseTimerMutation = usePauseTimerMutation();
  const resumeTimerMutation = useResumeTimerMutation();
  const startTimerMutation = useStartTimerMutation();
  const stopTimerMutation = useStopTimerMutation();
  const currentTimerQuery = useCurrentTimerQuery();
  const {
    data: timerContext,
    error: timerContextError,
    isLoading: isTimerContextLoading,
    isError: isTimerContextError,
  } = useTimerContextQuery();
  const {
    data: timeEntriesResponse,
    error: timeEntriesError,
    isError: isTimeEntriesError,
  } = useTimeEntriesQuery();
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [taskFilters, setTaskFilters] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const draft = useAppSelector(selectTimerDraft);
  const storeActiveEntry = useAppSelector(selectActiveTimerEntry);
  const editingEntryId = useAppSelector(selectEditingEntryId);
  const contextProjectOptions = useMemo(
    () =>
      timerContext?.timerReadyProjects.map(
        ({ project }) => project.name
      ) ?? [],
    [timerContext]
  );
  const contextTaskOptionsByProject = useMemo(
    () =>
      new Map(
        timerContext?.timerReadyProjects.map(({ project, tasks }) => [
          project.name,
          tasks.map((task) => task.name),
        ]) ?? []
      ),
    [timerContext]
  );
  const timerReadyProjectLookup = useMemo(
    () =>
      new Map(
        timerContext?.timerReadyProjects.map(({ project, tasks }) => [
          project.name,
          {
            projectId: project.id,
            tasksByName: new Map(
              tasks.map((task) => [task.name, task.id])
            ),
          },
        ]) ?? []
      ),
    [timerContext]
  );
  const projectOptions = useMemo(
    () => (isTimerContextError ? [] : contextProjectOptions),
    [contextProjectOptions, isTimerContextError]
  );
  const taskOptions = useMemo(
    () =>
      isTimerContextError || draft.project.trim().length === 0
        ? []
        : contextTaskOptionsByProject.get(draft.project) ?? [],
    [contextTaskOptionsByProject, draft.project, isTimerContextError]
  );
  const lastDisplayedElapsedRef = useRef<{
    entryId: string;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!storeActiveEntry || storeActiveEntry.status !== 'running') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [storeActiveEntry]);

  useEffect(() => {
    if (isTimerContextLoading) {
      return;
    }

    if (projectOptions.length === 0) {
      if (draft.project || draft.task) {
        dispatch(updateDraft({ project: '', task: '' }));
      }
      return;
    }

    if (!projectOptions.includes(draft.project)) {
      const nextProject = projectOptions[0] ?? '';
      const nextTask = nextProject
        ? (contextTaskOptionsByProject.get(nextProject)?.[0] ?? '')
        : '';
      dispatch(updateDraft({ project: nextProject, task: nextTask }));
      return;
    }

    if (taskOptions.length === 0) {
      if (draft.task) {
        dispatch(updateDraft({ task: '' }));
      }
      return;
    }

    if (!taskOptions.includes(draft.task)) {
      dispatch(updateDraft({ task: taskOptions[0] ?? '' }));
    }
  }, [
    contextTaskOptionsByProject,
    dispatch,
    draft.project,
    draft.task,
    isTimerContextLoading,
    projectOptions,
    taskOptions,
  ]);

  useEffect(() => {
    if (editingEntryId) {
      setEntryMode('manual');
    }
  }, [editingEntryId]);

  const activeEntry = useMemo(() => {
    if (!storeActiveEntry) {
      lastDisplayedElapsedRef.current = null;
      return null;
    }

    const computedElapsed = getTimerElapsedSeconds(
      storeActiveEntry,
      nowMs
    );
    const previousDisplayed =
      lastDisplayedElapsedRef.current?.entryId ===
      storeActiveEntry.id
        ? lastDisplayedElapsedRef.current.seconds
        : 0;
    const durationSeconds =
      storeActiveEntry.status === 'running' ||
      storeActiveEntry.status === 'paused'
        ? Math.max(computedElapsed, previousDisplayed)
        : computedElapsed;

    lastDisplayedElapsedRef.current = {
      entryId: storeActiveEntry.id,
      seconds: durationSeconds,
    };

    return {
      ...storeActiveEntry,
      durationSeconds,
    };
  }, [nowMs, storeActiveEntry]);

  const normalizedSearch = searchText.trim().toLowerCase();
  const backendRecentWorkEntries = useMemo(
    () => timeEntriesResponse?.items.map(toRecentWorkEntry) ?? [],
    [timeEntriesResponse]
  );

  const allProjects = useMemo(
    () => Array.from(new Set(backendRecentWorkEntries.map((entry) => entry.project))),
    [backendRecentWorkEntries]
  );

  const allTasks = useMemo(
    () => Array.from(new Set(backendRecentWorkEntries.map((entry) => entry.task))),
    [backendRecentWorkEntries]
  );

  const recentWorkEntries = useMemo(
    () =>
      backendRecentWorkEntries.filter((entry) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          entry.description.toLowerCase().includes(normalizedSearch);
        const matchesProject =
          projectFilters.length === 0 || projectFilters.includes(entry.project);
        const matchesTask =
          taskFilters.length === 0 || taskFilters.includes(entry.task);

        return matchesSearch && matchesProject && matchesTask;
      }),
    [backendRecentWorkEntries, normalizedSearch, projectFilters, taskFilters]
  );

  const filteredDayGroups = useMemo<TimerPageGroup[]>(() => {
    const grouped = recentWorkEntries.reduce<Record<string, TimerPageGroup>>(
      (accumulator, entry) => {
        if (!accumulator[entry.startDate]) {
          accumulator[entry.startDate] = {
            date: entry.startDate,
            entries: [],
            label: formatRelativeDateLabel(entry.startDate, new Date(nowMs)),
            totalSeconds: 0,
          };
        }

        accumulator[entry.startDate].entries.push(entry);
        accumulator[entry.startDate].totalSeconds += entry.durationSeconds;

        return accumulator;
      },
      {}
    );

    return Object.values(grouped).sort((left, right) =>
      right.date.localeCompare(left.date)
    );
  }, [nowMs, recentWorkEntries]);

  const todayIsoDate = useMemo(
    () => formatLocalDateKey(new Date(nowMs)),
    [nowMs]
  );
  const todayTotalSeconds = useMemo(
    () =>
      backendRecentWorkEntries
        .filter((entry) => entry.startDate === todayIsoDate)
        .reduce((total, entry) => total + entry.durationSeconds, 0),
    [backendRecentWorkEntries, todayIsoDate]
  );
  const weekStartIsoDate = useMemo(() => {
    const now = new Date(nowMs);
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return formatLocalDateKey(monday);
  }, [nowMs]);
  const weekTotalSeconds = useMemo(
    () =>
      backendRecentWorkEntries
        .filter((entry) => entry.startDate >= weekStartIsoDate)
        .reduce((total, entry) => total + entry.durationSeconds, 0),
    [backendRecentWorkEntries, weekStartIsoDate]
  );
  const sessionsTodayCount = useMemo(
    () =>
      backendRecentWorkEntries.filter((entry) => entry.startDate === todayIsoDate).length,
    [backendRecentWorkEntries, todayIsoDate]
  );
  const lastSessionDurationSeconds = useMemo(
    () => backendRecentWorkEntries[0]?.durationSeconds ?? null,
    [backendRecentWorkEntries]
  );
  const loadErrorMessage = useMemo(() => {
    if (actionErrorMessage) {
      return actionErrorMessage;
    }

    const error =
      currentTimerQuery.error ??
      (isTimeEntriesError ? timeEntriesError ?? new Error('Failed to load time entries.') : null) ??
      (isTimerContextError
        ? timerContextError ?? new Error('Failed to load timer context.')
        : null);

    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : 'Failed to load timer data.';
  }, [
    actionErrorMessage,
    currentTimerQuery.error,
    isTimeEntriesError,
    isTimerContextError,
    timeEntriesError,
    timerContextError,
  ]);

  const invalidateTimeEntries = async () => {
    await queryClient.invalidateQueries({
      queryKey: timerKeys.timeEntries(),
    });
  };

  const buildDateTimeIso = (date: string, time: string) =>
    new Date(`${date}T${time}:00`).toISOString();

  const manualDayLimitError = useMemo(
    () => getManualDayLimitError(backendRecentWorkEntries, draft, editingEntryId),
    [backendRecentWorkEntries, draft, editingEntryId]
  );

  const resolveProjectAndTaskIds = (
    projectName: string,
    taskName: string,
    preferredEntryId?: string | null
  ) => {
    const preferredEntry = preferredEntryId
      ? timeEntriesResponse?.items.find((entry) => entry.id === preferredEntryId)
      : undefined;

    if (
      preferredEntry &&
      preferredEntry.project.name === projectName &&
      preferredEntry.task.name === taskName
    ) {
      return {
        projectId: preferredEntry.project.id,
        taskId: preferredEntry.task.id,
      };
    }

    for (const readyProject of timerContext?.timerReadyProjects ?? []) {
      if (readyProject.project.name !== projectName) {
        continue;
      }

      const matchingTask = readyProject.tasks.find((task) => task.name === taskName);
      if (matchingTask) {
        return {
          projectId: readyProject.project.id,
          taskId: matchingTask.id,
        };
      }
    }

    const matchingEntry = timeEntriesResponse?.items.find(
      (entry) => entry.project.name === projectName && entry.task.name === taskName
    );

    if (matchingEntry) {
      return {
        projectId: matchingEntry.project.id,
        taskId: matchingEntry.task.id,
      };
    }

    return null;
  };

  const saveManualEntry = async () => {
    if (manualDayLimitError) {
      setActionErrorMessage(manualDayLimitError);
      return;
    }

    const resolvedIds = resolveProjectAndTaskIds(draft.project, draft.task);
    if (!resolvedIds) {
      return;
    }

    try {
      setActionErrorMessage(null);
      const entry = await timerApi.createManualTimeEntry({
        endAt: buildDateTimeIso(draft.endDate, draft.endTime),
        isBillable: draft.billable,
        projectId: resolvedIds.projectId,
        startAt: buildDateTimeIso(draft.startDate, draft.startTime),
        taskId: resolvedIds.taskId,
        workNote: draft.description.trim() || undefined,
      });

      dispatch(hydratePersistedStoppedEntry(entry));
      await invalidateTimeEntries();
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to save manual entry.'
      );
    }
  };

  const updateEntry = async () => {
    if (!editingEntryId) {
      return;
    }

    if (manualDayLimitError) {
      setActionErrorMessage(manualDayLimitError);
      return;
    }

    const resolvedIds = resolveProjectAndTaskIds(
      draft.project,
      draft.task,
      editingEntryId
    );
    if (!resolvedIds) {
      return;
    }

    try {
      setActionErrorMessage(null);
      const entry = await timerApi.updateTimeEntry(editingEntryId, {
        endAt: buildDateTimeIso(draft.endDate, draft.endTime),
        isBillable: draft.billable,
        projectId: resolvedIds.projectId,
        startAt: buildDateTimeIso(draft.startDate, draft.startTime),
        taskId: resolvedIds.taskId,
        workNote: draft.description.trim() || undefined,
      });

      dispatch(hydratePersistedStoppedEntry(entry));
      await invalidateTimeEntries();
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to update time entry.'
      );
    }
  };

  const openEntryForEditing = (entryId: string) => {
    const sourceEntry = recentWorkEntries.find((entry) => entry.id === entryId);

    if (!sourceEntry || sourceEntry.status === 'running') {
      return;
    }

    dispatch(hydrateEntryForEditing(sourceEntry));
  };

  return {
    activeEntry,
    allProjects,
    allTasks,
    draft,
    editingEntryId,
    entryMode,
    filteredDayGroups,
    onBillableChange: (checked) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ billable: checked }));
    },
    onCancelEdit: () => {
      setActionErrorMessage(null);
      dispatch(cancelEditing());
    },
    onClearDraft: () => {
      setActionErrorMessage(null);
      dispatch(clearDraft());
    },
    onDescriptionChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ description: value }));
    },
    onEditEntry: (entryId) =>
      openEntryForEditing(entryId),
    onEndDateChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ endDate: value }));
    },
    onEndTimeChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ endTime: value }));
    },
    onModeChange: setEntryMode,
    onProjectChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ project: value }));
    },
    onProjectFiltersChange: setProjectFilters,
    onPauseTimer: () =>
      {
        if (!activeEntry || pauseTimerMutation.isPending) {
          return;
        }

        pauseTimerMutation.mutate(undefined, {
          onSuccess: (entry) => {
            dispatch(hydratePausedTimer(entry));
          },
        });
      },
    onResumeEntry: (entryId) =>
      dispatch(resumeEntry({ entryId })),
    onResumeTimer: () => {
      if (!activeEntry || activeEntry.status !== 'paused' || resumeTimerMutation.isPending) {
        return;
      }

      resumeTimerMutation.mutate(undefined, {
        onSuccess: (entry) => {
          dispatch(hydrateResumedTimer(entry));
        },
      });
    },
    onSaveManualEntry: () => {
      if (Object.keys(validateTimerDraft(draft)).length > 0) {
        return;
      }

      void saveManualEntry();
    },
    onSearchTextChange: setSearchText,
    onStartDateChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ startDate: value }));
    },
    onStartOrStopTimer: (payload) => {
      if (storeActiveEntry) {
        if (stopTimerMutation.isPending) {
          return;
        }

        stopTimerMutation.mutate(payload, {
          onSuccess: (entry) => {
            dispatch(
              hydrateStoppedTimer({
                entry,
                billable: payload?.billable,
                notes: payload?.notes,
              })
            );
          },
        });
        return;
      }

      if (Object.keys(validateTimerDraft(draft)).length > 0) {
        return;
      }

      const selectedProject = timerReadyProjectLookup.get(
        draft.project
      );
      const selectedTaskId = selectedProject?.tasksByName.get(
        draft.task
      );

      if (
        !timerContext?.capabilities.canStartTimer ||
        !selectedProject ||
        !selectedTaskId ||
        startTimerMutation.isPending
      ) {
        return;
      }

      startTimerMutation.mutate(
        {
          projectId: selectedProject.projectId,
          taskId: selectedTaskId,
          isBillable: draft.billable,
          workNote: draft.description.trim() || undefined,
        },
        {
          onSuccess: (entry) => {
            dispatch(hydrateStartedTimer(entry));
          },
        }
      );
    },
    onStartTimeChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ startTime: value }));
    },
    onTaskChange: (value) => {
      setActionErrorMessage(null);
      dispatch(updateDraft({ task: value }));
    },
    onTaskFiltersChange: setTaskFilters,
    onUpdateEntry: () => {
      if (Object.keys(validateTimerDraft(draft)).length > 0) {
        return;
      }

      void updateEntry();
    },
    projectFilters,
    projectOptions,
    recentWorkEntries,
    searchText,
    taskFilters,
    taskOptions,
    lastSessionDurationSeconds,
    timerLoadError: loadErrorMessage,
    todaySessionsCount: sessionsTodayCount,
    todayTotalSeconds,
    weekTotalSeconds,
    isPausingTimer: pauseTimerMutation.isPending,
    isResumingTimer: resumeTimerMutation.isPending,
    isStartingTimer: startTimerMutation.isPending,
    isStoppingTimer: stopTimerMutation.isPending,
  };
};
