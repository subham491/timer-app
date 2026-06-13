import type {
  ProjectRecord,
  ProjectReadiness,
  ProjectStatus,
  ProjectTaskDraft,
  ProjectUserReference,
  ProjectsFormDraft,
} from '@/store/slices/projects/projects.types';
import type { AuthUserRole } from '@/store/slices/auth/auth.types';

export interface ProjectTableRow extends ProjectRecord {
  readiness: ProjectReadiness;
  timerReadinessReason: string | null;
}

export interface ProjectsSummaryMetric {
  label: string;
  value: string;
}

export interface ProjectActionPermissions {
  canCreateProject: boolean;
  canEditProject: boolean;
  canArchiveProject: boolean;
  canRestoreProject: boolean;
  canManageAssignments: boolean;
  canManageManagers: boolean;
  canManageTasks: boolean;
}

export interface ProjectsPageState {
  draft: ProjectsFormDraft;
  drawerMode: 'create' | 'edit';
  isDrawerOpen: boolean;
  projectRows: ProjectTableRow[];
  readinessFilters: ProjectReadiness[];
  searchText: string;
  selectedProject: ProjectTableRow | null;
  selectedProjectPermissions: ProjectActionPermissions | null;
  statusFilters: ProjectStatus[];
  summaryMetrics: ProjectsSummaryMetric[];
  userRole: AuthUserRole;
  users: ProjectUserReference[];
  onArchiveProject: (projectId: string) => void;
  onAssignmentUserIdsChange: (value: string[]) => void;
  onClearFilters: () => void;
  onCloseDrawer: () => void;
  onCloseProjectDetail: () => void;
  onDescriptionChange: (value: string) => void;
  onDraftStatusChange: (value: ProjectStatus) => void;
  getProjectPermissions: (projectId: string) => ProjectActionPermissions | null;
  onNameChange: (value: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onProjectManagerUserIdsChange: (value: string[]) => void;
  onReadinessChange: (value: ProjectReadiness[]) => void;
  onRestoreProject: (projectId: string) => void;
  onSaveProject: () => void;
  onSearchTextChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus[]) => void;
  onTasksChange: (value: ProjectTaskDraft[]) => void;
}
