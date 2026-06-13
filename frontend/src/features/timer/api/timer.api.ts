import type {
  CreateManualTimeEntryRequest,
  CurrentTimerResponse,
  ProjectReference,
  StartTimerRequest,
  TaskReference,
  TimeEntriesQueryParams,
  TimeEntryDetail,
  TimeEntrySummary,
  TimeEntryListResponse,
  TimerContextResponse,
  UpdateTimeEntryRequest,
  UserReference,
} from '@/features/timer/types';
import { formatDuration } from '@/features/timer/utils';
import { apiClient } from '@/shared/lib/apiClient';
interface BackendTimerProjectReference {
  id: string;
  isTimerReady: boolean;
  name: string;
  status: 'active' | 'archived';
  timerReadinessReason?: string | null;
}

interface BackendTimerTaskReference {
  id: string;
  name: string;
  projectId: string;
  status: 'active' | 'archived';
}

interface BackendTimerUserReference {
  email?: string | null;
  id: string;
  name: string;
}

interface BackendTimerEntry {
  createdAt?: string | null;
  durationSeconds?: number | null;
  endedAt?: string | null;
  id: string;
  isBillable: boolean;
  project?: BackendTimerProjectReference | null;
  source: 'manual' | 'timer';
  startedAt: string;
  status: 'paused' | 'running' | 'stopped';
  task?: BackendTimerTaskReference | null;
  updatedAt?: string | null;
  user?: BackendTimerUserReference | null;
  workNote?: string | null;
}

interface BackendCurrentTimerResponse {
  currentTimer: BackendTimerEntry | null;
}

interface BackendTimerContextResponse {
  capabilities: {
    canCreateManualEntry: boolean;
    canPauseTimer: boolean;
    canResumeTimer: boolean;
    canStartTimer: boolean;
    canStopTimer: boolean;
  };
  currentTimer: BackendTimerEntry | null;
  eligibleTasks?: BackendTimerTaskReference[];
  timerReadyProjects: Array<{
    project: BackendTimerProjectReference;
    tasks: BackendTimerTaskReference[];
  }>;
}

interface BackendTimeEntriesResponse {
  items: BackendTimerEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const createFallbackProject = (
  task?: BackendTimerTaskReference | null
): ProjectReference => ({
  code: null,
  id: task?.projectId ?? 'unknown-project',
  isTimerReady: false,
  name: 'Unknown project',
  status: 'archived',
  timerReadinessReason: 'Project details unavailable.',
});

const mapProjectReference = (
  project?: BackendTimerProjectReference | null,
  task?: BackendTimerTaskReference | null
): ProjectReference =>
  project
    ? {
        code: null,
        id: project.id,
        isTimerReady: project.isTimerReady,
        name: project.name,
        status: project.status,
        timerReadinessReason: project.timerReadinessReason ?? null,
      }
    : createFallbackProject(task);

const mapTaskReference = (
  task?: BackendTimerTaskReference | null,
  project?: BackendTimerProjectReference | null
): TaskReference => ({
  id: task?.id ?? 'unknown-task',
  name: task?.name ?? 'Unknown task',
  projectId: task?.projectId ?? project?.id ?? 'unknown-project',
  status: task?.status ?? 'archived',
});

const mapUserReference = (
  user?: BackendTimerUserReference | null
): UserReference => ({
  email: user?.email ?? undefined,
  id: user?.id ?? 'unknown-user',
  name: user?.name ?? 'Unknown user',
});

const mapTimeEntryDetail = (entry: BackendTimerEntry): TimeEntryDetail => {
  const durationSeconds =
    entry.status === 'running' ? null : entry.durationSeconds ?? null;
  const durationDisplay =
    entry.status === 'running'
      ? formatDuration(
          Math.max(
            Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 1000),
            0
          )
        )
      : durationSeconds !== null
        ? formatDuration(durationSeconds)
        : null;
  const isStopped = entry.status === 'stopped';

  return {
    canDelete: isStopped,
    canEdit: isStopped,
    createdAt: entry.createdAt ?? entry.startedAt,
    durationDisplay,
    durationSeconds,
    endAt: entry.endedAt ?? null,
    id: entry.id,
    isBillable: entry.isBillable,
    project: mapProjectReference(entry.project, entry.task),
    source: entry.source,
    startAt: entry.startedAt,
    status: entry.status as TimeEntryDetail['status'],
    task: mapTaskReference(entry.task, entry.project),
    updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.startedAt,
    user: mapUserReference(entry.user),
    workNote: entry.workNote ?? null,
  };
};

const mapTimeEntrySummary = (entry: BackendTimerEntry): TimeEntrySummary => {
  const detail = mapTimeEntryDetail(entry);

  return {
    durationDisplay: detail.durationDisplay,
    durationSeconds: detail.durationSeconds,
    endAt: detail.endAt,
    id: detail.id,
    isBillable: detail.isBillable,
    project: detail.project,
    source: detail.source,
    startAt: detail.startAt,
    status: detail.status,
    task: detail.task,
    user: detail.user,
    workNote: detail.workNote,
  };
};


const getJson = async <TBody>(path: string): Promise<TBody> => {
  const { data } = await apiClient.get<TBody>(path);
  return data;
};

const postJson = async <TRes, TReq>(path: string, body: TReq): Promise<TRes> => {
  const { data } = await apiClient.post<TRes>(path, body);
  return data;
};

const patchJson = async <TRes, TReq>(path: string, body: TReq): Promise<TRes> => {
  const { data } = await apiClient.patch<TRes>(path, body);
  return data;
};

const deleteRequest = async (path: string): Promise<null> => {
    await apiClient.delete(path);
    return null;
  };

const getCurrentTimerFromBackend = async (): Promise<CurrentTimerResponse> => {
  const response = await getJson<BackendCurrentTimerResponse>('/timer/current');

  return {
    runningEntry: response.currentTimer
      ? mapTimeEntryDetail(response.currentTimer)
      : null,
  };
};

const buildTimeEntriesQuery = (params?: TimeEntriesQueryParams) => {
  const query = new URLSearchParams();
  const permissiveParams = (params ?? {}) as TimeEntriesQueryParams & {
    endAt?: string;
    limit?: number;
    startAt?: string;
  };
  const projectId = params?.projectId?.[0];
  const taskId = params?.taskId?.[0];
  const statusValue = params?.status?.[0];
  const sourceValue = params?.source?.[0];
  const startAt = permissiveParams.startAt ?? params?.dateFrom;
  const endAt = permissiveParams.endAt ?? params?.dateTo;
  const limit = permissiveParams.limit ?? params?.pageSize;

  if (projectId) {
    query.set('projectId', projectId);
  }

  if (taskId) {
    query.set('taskId', taskId);
  }

  if (statusValue) {
    query.set('status', statusValue);
  }

  if (sourceValue) {
    query.set('source', sourceValue);
  }

  if (startAt) {
    query.set('startAt', startAt);
  }

  if (endAt) {
    query.set('endAt', endAt);
  }

  if (limit) {
    query.set('limit', String(limit));
  }

  if (params?.page) {
    query.set('page', String(params.page));
  }

  const queryString = query.toString();
  return queryString ? `/time-entries?${queryString}` : '/time-entries';
};

const getTimerContextFromBackend = async (): Promise<TimerContextResponse> => {
  const response = await getJson<BackendTimerContextResponse>('/timer/context');

  return {
    capabilities: {
      canCreateManualEntry: response.capabilities.canCreateManualEntry,
      canDeleteStoppedEntries: false,
      canEditStoppedEntries: false,
      canStartTimer: response.capabilities.canStartTimer,
      canUseRealtimeSync: false,
    },
    realtime: {
      endpoint: '/api/v1/timer/ws',
      supportedEvents: [],
      transport: 'websocket',
    },
    runningEntry: response.currentTimer
      ? mapTimeEntryDetail(response.currentTimer)
      : null,
    timerReadyProjects: response.timerReadyProjects.map(({ project, tasks }) => ({
      project: mapProjectReference(project),
      tasks: tasks.map((task) => mapTaskReference(task, project)),
    })),
  };
};

const listTimeEntriesFromBackend = async (
  params?: TimeEntriesQueryParams
): Promise<TimeEntryListResponse> => {
  const response = await getJson<BackendTimeEntriesResponse>(
    buildTimeEntriesQuery(params)
  );

  return {
    groupBy: params?.groupBy ?? 'none',
    groups: null,
    items: response.items.map(mapTimeEntrySummary),
    page: response.page,
    pageSize: response.pageSize,
    totalItems: response.totalItems,
    totalPages: response.totalPages,
  };
};

const createManualTimeEntryFromBackend = async (
  payload: CreateManualTimeEntryRequest
): Promise<TimeEntryDetail> => {
  const permissivePayload = payload as CreateManualTimeEntryRequest & {
    billable?: boolean;
    notes?: string;
  };
  const response = await postJson<
    BackendTimerEntry,
    {
      endAt: string;
      isBillable?: boolean;
      projectId: string;
      startAt: string;
      taskId: string;
      workNote?: string;
    }
  >('/time-entries/manual', {
    endAt: payload.endAt,
    isBillable: permissivePayload.isBillable ?? permissivePayload.billable,
    projectId: payload.projectId,
    startAt: payload.startAt,
    taskId: payload.taskId,
    workNote: payload.workNote ?? permissivePayload.notes,
  });

  return mapTimeEntryDetail(response);
};

const updateTimeEntryFromBackend = async (
  timeEntryId: string,
  payload: UpdateTimeEntryRequest
): Promise<TimeEntryDetail> => {
  const permissivePayload = payload as UpdateTimeEntryRequest & {
    billable?: boolean;
    notes?: string;
  };
  const response = await patchJson<
    BackendTimerEntry,
    {
      endAt?: string;
      isBillable?: boolean;
      projectId?: string;
      startAt?: string;
      taskId?: string;
      workNote?: string;
    }
  >(`/time-entries/${timeEntryId}`, {
    endAt: payload.endAt,
    isBillable: permissivePayload.isBillable ?? permissivePayload.billable,
    projectId: payload.projectId,
    startAt: payload.startAt,
    taskId: payload.taskId,
    workNote: payload.workNote ?? permissivePayload.notes,
  });

  return mapTimeEntryDetail(response);
};

const deleteTimeEntryFromBackend = async (timeEntryId: string): Promise<null> =>
  deleteRequest(`/time-entries/${timeEntryId}`);

const startTimerFromBackend = async (
  payload: StartTimerRequest
): Promise<TimeEntryDetail> => {
  const permissivePayload = payload as StartTimerRequest & {
    billable?: boolean;
    notes?: string;
  };
  const response = await postJson<
    BackendTimerEntry,
    {
      isBillable?: boolean;
      projectId: string;
      taskId: string;
      workNote?: string;
    }
  >('/timer/start', {
    isBillable: permissivePayload.isBillable ?? permissivePayload.billable,
    projectId: payload.projectId,
    taskId: payload.taskId,
    workNote: payload.workNote ?? permissivePayload.notes,
  });

  return mapTimeEntryDetail(response);
};

const pauseTimerFromBackend = async (): Promise<TimeEntryDetail> => {
  const response = await postJson<BackendTimerEntry, Record<string, never>>(
    '/timer/pause',
    {}
  );

  return mapTimeEntryDetail(response);
};

const resumeTimerFromBackend = async (): Promise<TimeEntryDetail> => {
  const response = await postJson<BackendTimerEntry, Record<string, never>>(
    '/timer/resume',
    {}
  );

  return mapTimeEntryDetail(response);
};

const stopTimerFromBackend = async (
  payload?:
    | {
        billable?: boolean;
        isBillable?: boolean;
        notes?: string;
        workNote?: string;
      }
    | undefined
): Promise<TimeEntryDetail> => {
  const response = await postJson<
    BackendTimerEntry,
    {
      isBillable?: boolean;
      workNote?: string;
    }
  >('/timer/stop', {
    isBillable: payload?.isBillable ?? payload?.billable,
    workNote: payload?.workNote ?? payload?.notes,
  });

  return mapTimeEntryDetail(response);
};

export const timerApi = {
  createManualTimeEntry: (
    payload: CreateManualTimeEntryRequest
  ): Promise<TimeEntryDetail> => createManualTimeEntryFromBackend(payload),

  deleteTimeEntry: (timeEntryId: string): Promise<null> =>
    deleteTimeEntryFromBackend(timeEntryId),

  getCurrentTimer: (): Promise<CurrentTimerResponse> => getCurrentTimerFromBackend(),

  getTimerContext: (): Promise<TimerContextResponse> => getTimerContextFromBackend(),

  listTimeEntries: (
    params?: TimeEntriesQueryParams
  ): Promise<TimeEntryListResponse> => listTimeEntriesFromBackend(params),

  pauseTimer: (): Promise<TimeEntryDetail> => pauseTimerFromBackend(),

  resumeTimer: (): Promise<TimeEntryDetail> => resumeTimerFromBackend(),

  startTimer: (payload: StartTimerRequest): Promise<TimeEntryDetail> =>
    startTimerFromBackend(payload),

  stopTimer: (
    payload?: {
      billable?: boolean;
      isBillable?: boolean;
      notes?: string;
      workNote?: string;
    }
  ): Promise<TimeEntryDetail> => stopTimerFromBackend(payload),

  updateTimeEntry: (
    timeEntryId: string,
    payload: UpdateTimeEntryRequest
  ): Promise<TimeEntryDetail> =>
    updateTimeEntryFromBackend(timeEntryId, payload),
};
