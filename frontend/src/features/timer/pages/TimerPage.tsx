import { Alert, Stack } from '@mui/material';
import { useEffect, useState } from 'react';

import {
  CurrentFocusCard,
  RecentWorkList,
  TimerEntryDrawer,
  TimerHeader,
  TodaySummaryCard,
} from '@/features/timer/components';
import { useTimerPageState } from '@/features/timer/hooks';

const TimerPage = () => {
  const {
    activeEntry,
    draft,
    editingEntryId,
    onBillableChange,
    onCancelEdit,
    onClearDraft,
    onDescriptionChange,
    onEditEntry,
    onEndDateChange,
    onEndTimeChange,
    onModeChange,
    onPauseTimer,
    onProjectChange,
    onResumeTimer,
    onSaveManualEntry,
    onStartOrStopTimer,
    onStartDateChange,
    onStartTimeChange,
    onTaskChange,
    onUpdateEntry,
    projectOptions,
    recentWorkEntries,
    taskOptions,
    lastSessionDurationSeconds,
    timerLoadError,
    todaySessionsCount,
    todayTotalSeconds,
    weekTotalSeconds,
    isPausingTimer,
    isResumingTimer,
    isStartingTimer,
    isStoppingTimer,
  } = useTimerPageState();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (editingEntryId) {
      setIsDrawerOpen(true);
    }
  }, [editingEntryId]);

  const handleOpenManualEntry = () => {
    onCancelEdit();
    onClearDraft();
    onModeChange('manual');
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    if (editingEntryId) {
      onCancelEdit();
      return;
    }

    onClearDraft();
  };

  return (
    <Stack spacing={{ xs: 2.5, lg: 3 }}>
      {timerLoadError ? <Alert severity="error">{timerLoadError}</Alert> : null}

      <TimerHeader todayTotalSeconds={todayTotalSeconds} />

      <Stack
        direction={{ xs: 'column', xl: 'row' }}
        spacing={{ xs: 2, lg: 2.5 }}
        sx={{ alignItems: 'stretch' }}
      >
        <CurrentFocusCard
          activeEntry={activeEntry}
          isPausingTimer={isPausingTimer}
          isResumingTimer={isResumingTimer}
          isStartingTimer={isStartingTimer}
          isStoppingTimer={isStoppingTimer}
          onPauseTimer={onPauseTimer}
          project={draft.project}
          projects={projectOptions}
          task={draft.task}
          tasks={taskOptions}
          onProjectChange={onProjectChange}
          onResumeTimer={onResumeTimer}
          onStartOrStopTimer={onStartOrStopTimer}
          onTaskChange={onTaskChange}
        />

        <TodaySummaryCard
          lastSessionDurationSeconds={lastSessionDurationSeconds}
          sessionCount={todaySessionsCount}
          weekTotalSeconds={weekTotalSeconds}
        />
      </Stack>

      <RecentWorkList
        entries={recentWorkEntries}
        onAddManualEntry={handleOpenManualEntry}
        onEditEntry={(entryId) => {
          onEditEntry(entryId);
          setIsDrawerOpen(true);
        }}
      />

      <TimerEntryDrawer
        open={isDrawerOpen}
        editingEntryId={editingEntryId}
        draft={draft}
        onBillableChange={onBillableChange}
        onClose={handleCloseDrawer}
        onDescriptionChange={onDescriptionChange}
        onEndDateChange={onEndDateChange}
        onEndTimeChange={onEndTimeChange}
        onProjectChange={onProjectChange}
        onSaveManualEntry={onSaveManualEntry}
        onStartDateChange={onStartDateChange}
        onStartTimeChange={onStartTimeChange}
        onTaskChange={onTaskChange}
        onUpdateEntry={onUpdateEntry}
        projectOptions={projectOptions}
        taskOptions={taskOptions}
      />
    </Stack>
  );
};

export default TimerPage;