import type {
  ProjectRecord,
  ProjectsFormDraft,
  ProjectTaskReference,
  ProjectUserReference,
} from '@/store/slices/projects/projects.types';
import { store } from '@/store/store';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1';

interface BackendProjectUserReference {
  email: string;
  id: string;
  name: string;
}

interface BackendProjectTaskReference {
  description: string;
  id: string;
  name: string;
  status: 'active' | 'archived';
}

interface BackendProjectRecord {
  activeTimerCount: number;
  assignments: BackendProjectUserReference[];
  createdAt: string;
  description: string;
  id: string;
  isTimerReady: boolean;
  name: string;
  projectManagers: BackendProjectUserReference[];
  status: 'active' | 'archived';
  tasks: BackendProjectTaskReference[];
  timerReadinessReason: string | null;
  updatedAt: string;
}

interface BackendProjectsListResponse {
  items: BackendProjectRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface BackendProjectLookupsResponse {
  assignableUsers: BackendProjectUserReference[];
  managerCandidates?: BackendProjectUserReference[];
  projectManagers?: BackendProjectUserReference[];
  statuses: Array<'active' | 'archived'>;
}

interface BackendProjectTasksResponse {
  items: BackendProjectTaskReference[];
}

interface BackendCreateProjectRequest {
  assignmentUserIds: string[];
  description: string;
  name: string;
  projectManagerUserIds: string[];
  status: 'active' | 'archived';
  taskCreates: Array<{
    id?: string | null;
    description: string;
    name: string;
    status: 'active' | 'archived';
  }>;
}

type BackendUpdateProjectRequest = BackendCreateProjectRequest;

const mapUserReference = (
  user: BackendProjectUserReference
): ProjectUserReference => ({
  email: user.email,
  id: user.id,
  name: user.name,
});

const mapTaskReference = (
  task: BackendProjectTaskReference
): ProjectTaskReference => ({
  description: task.description ?? '',
  id: task.id,
  name: task.name,
  status: task.status,
});

const mapProjectRecord = (project: BackendProjectRecord): ProjectRecord => ({
  activeTimerCount: project.activeTimerCount ?? 0,
  archivedReason:
    project.status === 'archived'
      ? project.timerReadinessReason ?? 'Project archived'
      : null,
  assignments: (project.assignments ?? []).map(mapUserReference),
  createdAt: project.createdAt,
  description: project.description ?? '',
  id: project.id,
  name: project.name,
  projectManagers: (project.projectManagers ?? []).map(mapUserReference),
  status: project.status,
  tasks: (project.tasks ?? []).map(mapTaskReference),
  updatedAt: project.updatedAt,
});

const mergeUsers = (
  ...collections: Array<BackendProjectUserReference[] | undefined>
): ProjectUserReference[] => {
  const usersById = new Map<string, ProjectUserReference>();

  collections.forEach((collection) => {
    collection?.forEach((user) => {
      usersById.set(user.id, mapUserReference(user));
    });
  });

  return Array.from(usersById.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};

const getAuthHeaders = () => {
  const token = store.getState().auth.token;

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
};

const getJson = async <TBody>(path: string): Promise<TBody> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  return (await response.json()) as TBody;
};

const postJson = async <TBodyResponse, TBodyRequest>(
  path: string,
  body: TBodyRequest
): Promise<TBodyResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  return (await response.json()) as TBodyResponse;
};

const patchJson = async <TBodyResponse, TBodyRequest>(
  path: string,
  body: TBodyRequest
): Promise<TBodyResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  return (await response.json()) as TBodyResponse;
};

const buildProjectMutationPayload = (
  draft: ProjectsFormDraft
): BackendCreateProjectRequest => ({
  assignmentUserIds: draft.assignmentUserIds,
  description: draft.description,
  name: draft.name,
  projectManagerUserIds: draft.projectManagerUserIds,
  status: draft.status,
  taskCreates: draft.tasks
    .map((task) => ({
      id: task.id,
      description: task.description.trim(),
      name: task.name.trim(),
      status: task.status,
    }))
    .filter((task) => task.name.length > 0),
});

const getProjectsListFromBackend = async (): Promise<ProjectRecord[]> => {
  const response = await getJson<BackendProjectsListResponse>('/projects');
  return response.items.map(mapProjectRecord);
};

const getProjectLookupsFromBackend = async () => {
  const response = await getJson<BackendProjectLookupsResponse>('/projects/lookups');

  return {
    assignableUsers: mergeUsers(response.assignableUsers),
    managerCandidates: mergeUsers(
      response.managerCandidates,
      response.projectManagers
    ),
    statuses: response.statuses,
  };
};

const getProjectDetailFromBackend = async (projectId: string): Promise<ProjectRecord> => {
  const [projectResponse, tasksResponse] = await Promise.all([
    getJson<BackendProjectRecord>(`/projects/${projectId}`),
    getJson<BackendProjectTasksResponse>(`/projects/${projectId}/tasks`),
  ]);

  return mapProjectRecord({
    ...projectResponse,
    tasks: tasksResponse.items,
  });
};

const createProjectFromBackend = async (draft: ProjectsFormDraft): Promise<ProjectRecord> => {
  const payload = buildProjectMutationPayload(draft);
  const response = await postJson<BackendProjectRecord, BackendCreateProjectRequest>(
    '/projects',
    payload
  );
  return mapProjectRecord(response);
};

const updateProjectFromBackend = async (draft: ProjectsFormDraft): Promise<ProjectRecord> => {
  if (!draft.id) {
    throw new Error('Project id is required for update.');
  }

  const payload: BackendUpdateProjectRequest = buildProjectMutationPayload(draft);
  const response = await patchJson<BackendProjectRecord, BackendUpdateProjectRequest>(
    `/projects/${draft.id}`,
    payload
  );

  return mapProjectRecord(response);
};

const archiveProjectFromBackend = async (projectId: string): Promise<ProjectRecord> => {
  const response = await postJson<BackendProjectRecord, Record<string, never>>(
    `/projects/${projectId}/archive`,
    {}
  );

  return mapProjectRecord(response);
};

const restoreProjectFromBackend = async (projectId: string): Promise<ProjectRecord> => {
  const response = await postJson<BackendProjectRecord, Record<string, never>>(
    `/projects/${projectId}/restore`,
    {}
  );

  return mapProjectRecord(response);
};

export const projectsApi = {
  archiveProject: (projectId: string): Promise<ProjectRecord> =>
    archiveProjectFromBackend(projectId),
  createProject: (draft: ProjectsFormDraft): Promise<ProjectRecord> =>
    createProjectFromBackend(draft),
  getProjectDetail: (projectId: string): Promise<ProjectRecord> =>
    getProjectDetailFromBackend(projectId),
  getProjectLookups: () => getProjectLookupsFromBackend(),
  getProjectsList: (): Promise<ProjectRecord[]> => getProjectsListFromBackend(),
  restoreProject: (projectId: string): Promise<ProjectRecord> =>
    restoreProjectFromBackend(projectId),
  updateProject: (draft: ProjectsFormDraft): Promise<ProjectRecord> =>
    updateProjectFromBackend(draft),
};
