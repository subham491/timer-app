import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  ProjectRecord,
  ProjectTaskDraft,
  ProjectStatus,
  ProjectsFilters,
  ProjectsFormDraft,
  ProjectsState,
} from './projects.types';

const createEmptyTaskDraft = (): ProjectTaskDraft => ({
  id: null,
  name: '',
  description: '',
  status: 'active',
});

const createEmptyDraft = (): ProjectsFormDraft => ({
  id: null,
  name: '',
  description: '',
  status: 'active',
  assignmentUserIds: [],
  projectManagerUserIds: [],
  tasks: [createEmptyTaskDraft()],
});

const getDraftFromProject = (project: ProjectRecord): ProjectsFormDraft => ({
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status,
  assignmentUserIds: project.assignments.map((user) => user.id),
  projectManagerUserIds: project.projectManagers.map((user) => user.id),
  tasks:
    project.tasks.length > 0
      ? project.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
        }))
      : [createEmptyTaskDraft()],
});

const initialFilters: ProjectsFilters = {
  searchText: '',
  statuses: ['active'],
  readiness: ['ready', 'blocked'],
};

const initialState: ProjectsState = {
  ui: {
    drawerMode: 'create',
    isDrawerOpen: false,
    filters: initialFilters,
    draft: createEmptyDraft(),
    selectedProjectId: null,
  },
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    archiveProject() {
      // Compatibility shim: server data is now owned by React Query.
    },
    setProjectsSearchText(state, action: PayloadAction<string>) {
      state.ui.filters.searchText = action.payload;
    },
    setProjectsStatuses(state, action: PayloadAction<ProjectStatus[]>) {
      state.ui.filters.statuses = action.payload;
    },
    setProjectsReadiness(state, action: PayloadAction<ProjectsFilters['readiness']>) {
      state.ui.filters.readiness = action.payload;
    },
    clearProjectsFilters(state) {
      state.ui.filters = { ...initialFilters };
    },
    setSelectedProjectId(state, action: PayloadAction<string | null>) {
      state.ui.selectedProjectId = action.payload;
    },
    openCreateProjectDrawer(state) {
      state.ui.drawerMode = 'create';
      state.ui.isDrawerOpen = true;
      state.ui.draft = createEmptyDraft();
      state.ui.selectedProjectId = null;
    },
    openEditProjectDrawer(state) {
      state.ui.drawerMode = 'edit';
      state.ui.isDrawerOpen = true;
    },
    populateProjectDraft(state, action: PayloadAction<ProjectRecord>) {
      state.ui.draft = getDraftFromProject(action.payload);
    },
    closeProjectDrawer(state) {
      state.ui.isDrawerOpen = false;
      state.ui.draft = createEmptyDraft();
      state.ui.drawerMode = 'create';
    },
    restoreProject() {
      // Compatibility shim: server data is now owned by React Query.
    },
    saveProjectDraft(state) {
      state.ui.isDrawerOpen = false;
      state.ui.draft = createEmptyDraft();
      state.ui.drawerMode = 'create';
    },
    updateProjectDraftField(
      state,
      action: PayloadAction<{ field: keyof ProjectsFormDraft; value: ProjectsFormDraft[keyof ProjectsFormDraft] }>
    ) {
      const { field, value } = action.payload;
      state.ui.draft[field] = value as never;
    },
  },
});

export const {
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
} = projectsSlice.actions;

export default projectsSlice.reducer;
