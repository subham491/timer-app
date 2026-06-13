export type ProjectStatus = 'active' | 'archived';
export type ProjectTaskStatus = 'active' | 'archived';
export type ProjectReadiness = 'ready' | 'blocked';

export interface ProjectUserReference {
  id: string;
  name: string;
  email: string;
}

export interface ProjectTaskReference {
  id: string;
  name: string;
  description: string;
  status: ProjectTaskStatus;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  assignments: ProjectUserReference[];
  projectManagers: ProjectUserReference[];
  tasks: ProjectTaskReference[];
  activeTimerCount: number;
  archivedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsFilters {
  searchText: string;
  statuses: ProjectStatus[];
  readiness: ProjectReadiness[];
}

export interface ProjectTaskDraft {
  id: string | null;
  name: string;
  description: string;
  status: ProjectTaskStatus;
}

export interface ProjectsFormDraft {
  id: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  assignmentUserIds: string[];
  projectManagerUserIds: string[];
  tasks: ProjectTaskDraft[];
}

export interface ProjectsUiState {
  drawerMode: 'create' | 'edit';
  isDrawerOpen: boolean;
  filters: ProjectsFilters;
  draft: ProjectsFormDraft;
  selectedProjectId: string | null;
}

export interface ProjectsState {
  ui: ProjectsUiState;
}
