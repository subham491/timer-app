import type { RootState } from '@/store/store';

export const selectProjectsState = (state: RootState) => state.projects;

export const selectProjectsUi = (state: RootState) => state.projects.ui;

export const selectProjectsFilters = (state: RootState) => state.projects.ui.filters;

export const selectProjectsDraft = (state: RootState) => state.projects.ui.draft;

export const selectProjectsSelectedProjectId = (state: RootState) =>
  state.projects.ui.selectedProjectId;
