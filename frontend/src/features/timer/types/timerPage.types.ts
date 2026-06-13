import type {
  TimerDraft,
  TimerEntry,
} from '@/store/slices/timer/timer.types';

export type EntryMode = 'timer' | 'manual';

export interface TimerPageGroup {
  date: string;
  entries: TimerEntry[];
  label: string;
  totalSeconds: number;
}

export interface UseTimerPageStateResult {
  activeEntry: TimerEntry | null;
  allProjects: string[];
  allTasks: string[];
  draft: TimerDraft;
  editingEntryId: string | null;
  entryMode: EntryMode;
  filteredDayGroups: TimerPageGroup[];
  onBillableChange: (checked: boolean) => void;
  onCancelEdit: () => void;
  onClearDraft: () => void;
  onDescriptionChange: (value: string) => void;
  onEditEntry: (entryId: string) => void;
  onEndDateChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onModeChange: (mode: EntryMode) => void;
  onProjectChange: (value: string) => void;
  onProjectFiltersChange: (value: string[]) => void;
  onPauseTimer: () => void;
  onResumeEntry: (entryId: string) => void;
  onResumeTimer: () => void;
  onSaveManualEntry: () => void;
  onSearchTextChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartOrStopTimer: (payload?: {
    billable?: boolean;
    notes?: string;
  }) => void;
  onStartTimeChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onTaskFiltersChange: (value: string[]) => void;
  onUpdateEntry: () => void;
  projectFilters: string[];
  projectOptions: string[];
  recentWorkEntries: TimerEntry[];
  searchText: string;
  taskFilters: string[];
  taskOptions: string[];
  lastSessionDurationSeconds: number | null;
  timerLoadError: string | null;
  todaySessionsCount: number;
  todayTotalSeconds: number;
  weekTotalSeconds: number;
  isPausingTimer: boolean;
  isResumingTimer: boolean;
  isStartingTimer: boolean;
  isStoppingTimer: boolean;
}