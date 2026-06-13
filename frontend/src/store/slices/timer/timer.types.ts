export interface TimerEntry {
  id: string;
  description: string;
  project: string;
  task: string;
  billable: boolean;
  startDate: string;
  startTime: string;
  endDate: string | null;
  endTime: string | null;
  durationSeconds: number;
  startedAt?: string;
  endedAt?: string | null;
  runningStartedAt?: string | null;
  status: 'running' | 'paused' | 'stopped';
}

export interface TimerDraft {
  description: string;
  project: string;
  task: string;
  billable: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export interface TimerState {
  entries: TimerEntry[];
  draft: TimerDraft;
  activeEntryId: string | null;
  editingEntryId: string | null;
}
