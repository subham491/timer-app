import type { ReactNode } from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getTheme } from '@/app/theme';
import { useProjectsPageState } from '@/features/projects/hooks';
import type { ProjectRecord, ProjectsState } from '@/store/slices/projects/projects.types';
import type { AuthState } from '@/store/slices/auth/auth.types';
import rootReducer from '@/store/rootReducer';
import type { RootState } from '@/store/store';

const FIXED_NOW = new Date('2026-06-09T12:00:00.000Z');

const mockUsers = [
  { id: 'u-1', name: 'Arya', email: 'arya@example.com' },
  { id: 'u-2', name: 'Shanavi', email: 'shanavi@example.com' },
  { id: 'u-3', name: 'Aswath', email: 'aswath@example.com' },
  { id: 'u-4', name: 'Mohamed', email: 'mohamed@example.com' },
];

const makeProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: 'p-100',
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  assignments: [mockUsers[2]],
  projectManagers: [mockUsers[0]],
  tasks: [
    {
      id: 't-1',
      name: 'Task One',
      description: 'Task description',
      status: 'active',
    },
  ],
  activeTimerCount: 0,
  archivedReason: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const adminAuth: AuthState = {
  isAuthenticated: true,
  token: 'token',
  user: {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'administrator',
  },
};

const defaultProjectsState: ProjectsState = {
  ui: {
    drawerMode: 'create',
    isDrawerOpen: false,
    filters: {
      searchText: '',
      statuses: ['active'],
      readiness: ['ready', 'blocked'],
    },
    draft: {
      id: null,
      name: '',
      description: '',
      status: 'active',
      assignmentUserIds: [],
      projectManagerUserIds: [],
      tasks: [{ id: null, name: '', description: '', status: 'active' }],
    },
    selectedProjectId: null,
  },
};

type MockProjectsQueriesState = {
  detail: ProjectRecord | null;
  lookups: {
    assignableUsers: typeof mockUsers;
    managerCandidates: typeof mockUsers;
    statuses: Array<'active' | 'archived'>;
  };
  projects: ProjectRecord[];
};

const mockProjectsQueriesState: MockProjectsQueriesState = {
  detail: null,
  lookups: {
    assignableUsers: mockUsers,
    managerCandidates: mockUsers,
    statuses: ['active', 'archived'],
  },
  projects: [makeProject()],
};

const mockArchiveMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockRestoreMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();

vi.mock('@/features/projects/hooks/useProjectsQueries', () => ({
  projectKeys: {
    all: ['projects'],
    detail: (projectId: string) => ['projects', 'detail', projectId],
    list: () => ['projects', 'list'],
    lookups: () => ['projects', 'lookups'],
  },
  useProjectDetailQuery: () => ({
    data: mockProjectsQueriesState.detail,
  }),
  useProjectLookupsQuery: () => ({
    data: mockProjectsQueriesState.lookups,
  }),
  useProjectsListQuery: () => ({
    data: mockProjectsQueriesState.projects,
  }),
}));

vi.mock('@/features/projects/hooks/useProjectMutations', () => ({
  useArchiveProjectMutation: () => ({
    isPending: false,
    mutateAsync: mockArchiveMutateAsync,
  }),
  useCreateProjectMutation: () => ({
    isPending: false,
    mutateAsync: mockCreateMutateAsync,
  }),
  useRestoreProjectMutation: () => ({
    isPending: false,
    mutateAsync: mockRestoreMutateAsync,
  }),
  useUpdateProjectMutation: () => ({
    isPending: false,
    mutateAsync: mockUpdateMutateAsync,
  }),
}));

const createStore = ({
  auth = adminAuth,
  projectsOverrides = {},
}: {
  auth?: AuthState;
  projectsOverrides?: Partial<ProjectsState>;
} = {}) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth,
      projects: {
        ...defaultProjectsState,
        ...projectsOverrides,
        ui: {
          ...defaultProjectsState.ui,
          ...projectsOverrides.ui,
        },
      },
    } as Partial<RootState>,
  });

const makeWrapper = (store: ReturnType<typeof createStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={getTheme('light')}>
          <MemoryRouter>{children}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('useProjectsPageState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockProjectsQueriesState.projects = [makeProject()];
    mockProjectsQueriesState.detail = null;
    mockProjectsQueriesState.lookups = {
      assignableUsers: mockUsers,
      managerCandidates: mockUsers,
      statuses: ['active', 'archived'],
    };
    mockArchiveMutateAsync.mockReset();
    mockCreateMutateAsync.mockReset();
    mockRestoreMutateAsync.mockReset();
    mockUpdateMutateAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters by search text across name and description', () => {
    mockProjectsQueriesState.projects = [
      makeProject({ id: 'p-1', name: 'EV Charging Platform' }),
      makeProject({ id: 'p-2', name: 'Internal Operations', description: 'Desk support workspace' }),
    ];

    const store = createStore();
    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      result.current.onSearchTextChange('desk support');
    });

    expect(result.current.projectRows).toHaveLength(1);
    expect(result.current.projectRows[0].name).toBe('Internal Operations');
  });

  it('filters by readiness', () => {
    mockProjectsQueriesState.projects = [
      makeProject({ id: 'p-1' }),
      makeProject({ id: 'p-2', tasks: [], name: 'Blocked Project' }),
    ];

    const store = createStore();
    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      result.current.onReadinessChange(['blocked']);
    });

    expect(result.current.projectRows).toHaveLength(1);
    expect(result.current.projectRows[0].name).toBe('Blocked Project');
    expect(result.current.projectRows[0].readiness).toBe('blocked');
  });

  it('marks archived projects as blocked with a reason', () => {
    mockProjectsQueriesState.projects = [
      makeProject({
        id: 'p-1',
        status: 'archived',
        archivedReason: 'Project archived',
        tasks: [],
      }),
    ];

    const store = createStore({
      projectsOverrides: {
        ui: {
          ...defaultProjectsState.ui,
          filters: {
            searchText: '',
            statuses: ['active', 'archived'],
            readiness: ['ready', 'blocked'],
          },
        },
      },
    });

    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current.projectRows[0].readiness).toBe('blocked');
    expect(result.current.projectRows[0].timerReadinessReason).toBe('Project archived');
  });

  it('calculates summary metrics from visible rows', () => {
    mockProjectsQueriesState.projects = [
      makeProject({ id: 'p-1', assignments: [mockUsers[0], mockUsers[1]] }),
      makeProject({ id: 'p-2', status: 'archived', archivedReason: 'Project archived', tasks: [] }),
    ];

    const store = createStore({
      projectsOverrides: {
        ui: {
          ...defaultProjectsState.ui,
          filters: {
            searchText: '',
            statuses: ['active', 'archived'],
            readiness: ['ready', 'blocked'],
          },
        },
      },
    });

    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current.summaryMetrics.find((metric) => metric.label === 'Active projects')?.value).toBe('1');
    expect(result.current.summaryMetrics.find((metric) => metric.label === 'Archived')?.value).toBe('1');
    expect(result.current.summaryMetrics.find((metric) => metric.label === 'Timer ready')?.value).toBe('1');
    expect(result.current.summaryMetrics.find((metric) => metric.label === 'Assignments')?.value).toBe('3');
  });

  it('opens the create drawer and updates task drafts', () => {
    const store = createStore();
    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      result.current.onOpenCreate();
      result.current.onTasksChange([
        { id: null, name: 'Build Timer UI', description: 'Create premium UI', status: 'active' },
      ]);
    });

    expect(result.current.isDrawerOpen).toBe(true);
    expect(result.current.draft.tasks[0].name).toBe('Build Timer UI');
  });

  it('stores selected project for the detail drawer', () => {
    mockProjectsQueriesState.projects = [makeProject({ id: 'p-1', name: 'EV Charging Platform' })];

    const store = createStore();
    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      result.current.onOpenProject('p-1');
    });

    expect(result.current.selectedProject?.name).toBe('EV Charging Platform');
    expect(result.current.selectedProjectPermissions?.canEditProject).toBe(true);
  });

  it('uses the backend project list as-is for regular users and keeps actions read-only', () => {
    mockProjectsQueriesState.projects = [
      makeProject({ id: 'p-1', assignments: [mockUsers[2]] }),
      makeProject({ id: 'p-2', assignments: [mockUsers[3]], name: 'Other Project' }),
    ];

    const store = createStore({
      auth: {
        isAuthenticated: true,
        token: 'token',
        user: {
          id: 'u-3',
          name: 'Aswath',
          email: 'aswath@example.com',
          role: 'regularUser',
        },
      },
    });

    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current.projectRows).toHaveLength(2);
    expect(result.current.getProjectPermissions('p-1')?.canEditProject).toBe(false);
  });

  it('allows manager permissions when backend manager references use a stable id but matching email', () => {
    mockProjectsQueriesState.projects = [
      makeProject({
        id: 'p-1',
        projectManagers: [
          {
            id: 'usr-7f2a',
            name: 'Aswath',
            email: 'aswath@example.com',
          },
        ],
      }),
    ];

    const store = createStore({
      auth: {
        isAuthenticated: true,
        token: 'token',
        user: {
          id: '3',
          name: 'Aswath',
          email: 'aswath@example.com',
          role: 'manager',
        },
      },
    });

    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current.projectRows).toHaveLength(1);
    expect(result.current.getProjectPermissions('p-1')?.canEditProject).toBe(true);
    expect(result.current.getProjectPermissions('p-1')?.canArchiveProject).toBe(true);
  });

  it('allows administrators to restore archived projects', async () => {
    mockProjectsQueriesState.projects = [
      makeProject({
        id: 'p-100',
        status: 'archived',
        archivedReason: 'Project archived',
        tasks: [],
      }),
    ];
    mockRestoreMutateAsync.mockResolvedValue(mockProjectsQueriesState.projects[0]);

    const store = createStore({
      projectsOverrides: {
        ui: {
          ...defaultProjectsState.ui,
          filters: {
            searchText: '',
            statuses: ['active', 'archived'],
            readiness: ['ready', 'blocked'],
          },
        },
      },
    });

    const { result } = renderHook(() => useProjectsPageState(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.onRestoreProject('p-100');
    });

    expect(mockRestoreMutateAsync).toHaveBeenCalledWith('p-100');
  });
});
