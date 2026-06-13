import { describe, it, expect } from 'vitest';

import projectsReducer, {
  archiveProject,
  clearProjectsFilters,
  closeProjectDrawer,
  openCreateProjectDrawer,
  openEditProjectDrawer,
  populateProjectDraft,
  restoreProject,
  saveProjectDraft,
  setProjectsReadiness,
  setProjectsSearchText,
  setProjectsStatuses,
  setSelectedProjectId,
  updateProjectDraftField,
} from '../projects/projectsSlice';
import type { ProjectRecord, ProjectsState } from '../projects/projects.types';

const mockUsers = [
  { id: 'u-1', name: 'Arya', email: 'arya@example.com' },
  { id: 'u-2', name: 'Shanavi', email: 'shanavi@example.com' },
];

const makeProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: 'p-100',
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  assignments: [mockUsers[0]],
  projectManagers: [mockUsers[1]],
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

const makeInitialState = (overrides: Partial<ProjectsState> = {}): ProjectsState => ({
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
  ...overrides,
});

describe('projectsSlice', () => {
  it('loads with the UI-only projects state shape on initialization', () => {
    const state = projectsReducer(undefined, { type: '@@INIT' });
    expect(state.ui.drawerMode).toBe('create');
    expect(state.ui.selectedProjectId).toBeNull();
  });

  it('updates search, status, and readiness filters', () => {
    const state = makeInitialState();
    const next = projectsReducer(
      projectsReducer(
        projectsReducer(state, setProjectsSearchText('ev')),
        setProjectsStatuses(['active', 'archived'])
      ),
      setProjectsReadiness(['blocked'])
    );

    expect(next.ui.filters.searchText).toBe('ev');
    expect(next.ui.filters.statuses).toEqual(['active', 'archived']);
    expect(next.ui.filters.readiness).toEqual(['blocked']);
  });

  it('resets filters to their defaults', () => {
    const state = makeInitialState({
      ui: {
        ...makeInitialState().ui,
        filters: {
          searchText: 'search',
          statuses: ['archived'],
          readiness: ['blocked'],
        },
      },
    });

    const next = projectsReducer(state, clearProjectsFilters());

    expect(next.ui.filters).toEqual({
      searchText: '',
      statuses: ['active'],
      readiness: ['ready', 'blocked'],
    });
  });

  it('opens the create drawer with a fresh task draft', () => {
    const next = projectsReducer(makeInitialState(), openCreateProjectDrawer());

    expect(next.ui.isDrawerOpen).toBe(true);
    expect(next.ui.drawerMode).toBe('create');
    expect(next.ui.selectedProjectId).toBeNull();
    expect(next.ui.draft.tasks).toHaveLength(1);
    expect(next.ui.draft.tasks[0].name).toBe('');
  });

  it('opens the edit drawer without mutating the draft directly', () => {
    const next = projectsReducer(makeInitialState(), openEditProjectDrawer());

    expect(next.ui.drawerMode).toBe('edit');
    expect(next.ui.isDrawerOpen).toBe(true);
  });

  it('populates the draft from a project record', () => {
    const next = projectsReducer(
      makeInitialState(),
      populateProjectDraft(
        makeProject({
          tasks: [
            {
              id: 't-1',
              name: 'Build Timer UI',
              description: 'Create timer-ready screens',
              status: 'archived',
            },
          ],
        })
      )
    );

    expect(next.ui.draft.id).toBe('p-100');
    expect(next.ui.draft.assignmentUserIds).toEqual(['u-1']);
    expect(next.ui.draft.projectManagerUserIds).toEqual(['u-2']);
    expect(next.ui.draft.tasks[0]).toEqual({
      id: 't-1',
      name: 'Build Timer UI',
      description: 'Create timer-ready screens',
      status: 'archived',
    });
  });

  it('closes the drawer and resets the draft', () => {
    const next = projectsReducer(
      makeInitialState({
        ui: {
          ...makeInitialState().ui,
          isDrawerOpen: true,
          drawerMode: 'edit',
          draft: {
            id: 'p-100',
            name: 'Something',
            description: '',
            status: 'active',
            assignmentUserIds: ['u-1'],
            projectManagerUserIds: ['u-2'],
            tasks: [{ id: 't-1', name: 'Task', description: '', status: 'active' }],
          },
        },
      }),
      closeProjectDrawer()
    );

    expect(next.ui.isDrawerOpen).toBe(false);
    expect(next.ui.drawerMode).toBe('create');
    expect(next.ui.draft.id).toBeNull();
    expect(next.ui.draft.tasks[0].name).toBe('');
  });

  it('updates task drafts through updateProjectDraftField', () => {
    const next = projectsReducer(
      makeInitialState(),
      updateProjectDraftField({
        field: 'tasks',
        value: [
          {
            id: null,
            name: 'API Integration',
            description: 'Connect the project drawer',
            status: 'active',
          },
        ],
      })
    );

    expect(next.ui.draft.tasks[0].name).toBe('API Integration');
    expect(next.ui.draft.tasks[0].description).toBe('Connect the project drawer');
  });

  it('tracks the selected project id', () => {
    const next = projectsReducer(makeInitialState(), setSelectedProjectId('p-100'));
    expect(next.ui.selectedProjectId).toBe('p-100');
  });

  it('saveProjectDraft only closes and resets UI draft state', () => {
    const next = projectsReducer(
      makeInitialState({
        ui: {
          ...makeInitialState().ui,
          isDrawerOpen: true,
          drawerMode: 'edit',
          draft: {
            id: 'p-100',
            name: 'Updated Project',
            description: 'Updated description',
            status: 'archived',
            assignmentUserIds: ['u-2'],
            projectManagerUserIds: ['u-1'],
            tasks: [
              {
                id: 't-1',
                name: 'Old Task',
                description: 'Archived during edit',
                status: 'archived',
              },
            ],
          },
        },
      }),
      saveProjectDraft()
    );

    expect(next.ui.isDrawerOpen).toBe(false);
    expect(next.ui.drawerMode).toBe('create');
    expect(next.ui.draft.id).toBeNull();
  });

  it('archive and restore actions remain compatibility no-ops', () => {
    const state = makeInitialState();
    expect(projectsReducer(state, archiveProject())).toEqual(state);
    expect(projectsReducer(state, restoreProject())).toEqual(state);
  });
});
