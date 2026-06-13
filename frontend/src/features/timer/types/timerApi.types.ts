export type TimerHttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST';

export type TimeEntrySource = 'manual' | 'timer';

export type TimeEntryStatus = 'running' | 'stopped';

export type ProjectStatus = 'active' | 'archived';

export type TaskStatus = 'active' | 'archived';

export type TimeEntryGroupBy = 'date' | 'none' | 'task';

export type TimeEntrySortBy =
  | 'createdAt'
  | 'durationSeconds'
  | 'endAt'
  | 'startAt'
  | 'updatedAt';

export type SortOrder = 'asc' | 'desc';

export interface ErrorResponse {
  code: string | null;
  detail: string;
}

export interface UserReference {
  email?: string;
  id: string;
  name: string;
}

export interface ProjectReference {
  code: string | null;
  id: string;
  isTimerReady: boolean;
  name: string;
  status: ProjectStatus;
  timerReadinessReason: string | null;
}

export interface TaskReference {
  id: string;
  name: string;
  projectId: string;
  status: TaskStatus;
}

export interface TimeEntrySummary {
  durationDisplay: string | null;
  durationSeconds: number | null;
  endAt: string | null;
  id: string;
  isBillable: boolean;
  project: ProjectReference;
  source: TimeEntrySource;
  startAt: string;
  status: TimeEntryStatus;
  task: TaskReference;
  user: UserReference;
  workNote: string | null;
}

export interface TimeEntryDetail extends TimeEntrySummary {
  canDelete: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentTimerResponse {
  runningEntry: TimeEntryDetail | null;
}

export interface TimerReadyProject {
  project: ProjectReference;
  tasks: TaskReference[];
}

export interface TimerCapabilities {
  canCreateManualEntry: boolean;
  canDeleteStoppedEntries: boolean;
  canEditStoppedEntries: boolean;
  canStartTimer: boolean;
  canUseRealtimeSync: boolean;
}

export type TimerRealtimeEventType =
  | 'time-entry.created'
  | 'time-entry.deleted'
  | 'time-entry.updated'
  | 'timer.context.invalidated'
  | 'timer.paused'
  | 'timer.resumed'
  | 'timer.started'
  | 'timer.stopped';

export interface TimerRealtimeMetadata {
  endpoint: string;
  supportedEvents: TimerRealtimeEventType[];
  transport: 'websocket';
}

export interface TimerContextResponse {
  capabilities: TimerCapabilities;
  realtime: TimerRealtimeMetadata;
  runningEntry: TimeEntryDetail | null;
  timerReadyProjects: TimerReadyProject[];
}

export interface StartTimerRequest {
  isBillable?: boolean;
  projectId: string;
  taskId: string;
  workNote?: string;
}

export interface CreateManualTimeEntryRequest {
  endAt: string;
  isBillable?: boolean;
  projectId: string;
  startAt: string;
  taskId: string;
  workNote?: string;
}

export interface UpdateTimeEntryRequest {
  endAt?: string;
  isBillable?: boolean;
  projectId?: string;
  startAt?: string;
  taskId?: string;
  workNote?: string;
}

export interface TimeEntriesQueryParams {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: TimeEntryGroupBy;
  page?: number;
  pageSize?: number;
  projectId?: string[];
  search?: string;
  sortBy?: TimeEntrySortBy;
  sortOrder?: SortOrder;
  source?: TimeEntrySource[];
  status?: TimeEntryStatus[];
  taskId?: string[];
}

export interface TimeEntryGroup {
  groupKey: string;
  groupLabel: string;
  itemCount: number;
  items: TimeEntrySummary[];
  project: ProjectReference | null;
  task: TaskReference | null;
  totalDurationSeconds: number;
}

export interface TimeEntryListResponse {
  groupBy: TimeEntryGroupBy;
  groups: TimeEntryGroup[] | null;
  items: TimeEntrySummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TimerMockEndpoint {
  method: TimerHttpMethod;
  path: string;
}

export interface TimerMockHttpResponse<TBody> {
  body: TBody;
  status: number;
}
