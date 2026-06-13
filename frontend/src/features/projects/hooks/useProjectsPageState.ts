import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  clearProjectsFilters,
  closeProjectDrawer,
  openCreateProjectDrawer,
  openEditProjectDrawer,
  populateProjectDraft,
  setProjectsReadiness,
  setProjectsSearchText,
  setProjectsStatuses,
  setSelectedProjectId,
  updateProjectDraftField,
} from '@/store/slices/projects/projectsSlice';
import {
  selectProjectsSelectedProjectId,
  selectProjectsUi,
} from '@/store/slices/projects/projectsSelectors';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { projectsApi } from '@/features/projects/api/projects.api';
import {
  projectKeys,
  useProjectDetailQuery,
  useProjectLookupsQuery,
  useProjectsListQuery,
} from '@/features/projects/hooks/useProjectsQueries';
import {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  useRestoreProjectMutation,
  useUpdateProjectMutation,
} from '@/features/projects/hooks/useProjectMutations';
import type {
  ProjectActionPermissions,
  ProjectTableRow,
  ProjectsPageState,
  ProjectsSummaryMetric,
} from '@/features/projects/types/projectsPage.types';
import type {
  ProjectReadiness,
  ProjectRecord,
  ProjectUserReference,
  ProjectTaskDraft,
} from '@/store/slices/projects/projects.types';

const getTimerReadiness = (project: ProjectRecord) => {
  if (project.status === 'archived') {
    return {
      readiness: 'blocked' as ProjectReadiness,
      timerReadinessReason: project.archivedReason ?? 'Project archived',
    };
  }

  const activeTaskCount = project.tasks.filter((task) => task.status === 'active').length;

  if (activeTaskCount > 0) {
    return {
      readiness: 'ready' as ProjectReadiness,
      timerReadinessReason: null,
    };
  }

  return {
    readiness: 'blocked' as ProjectReadiness,
    timerReadinessReason: 'Add at least one active task to enable timers.',
  };
};

const isSameProjectUser = (
  authUser: { id: string; email: string } | null,
  projectUser: ProjectUserReference
) => {
  if (!authUser) {
    return false;
  }

  return (
    projectUser.id === authUser.id ||
    projectUser.email.toLowerCase() === authUser.email.toLowerCase()
  );
};

export const useProjectsPageState = (): ProjectsPageState => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const ui = useAppSelector(selectProjectsUi);
  const selectedProjectId = useAppSelector(selectProjectsSelectedProjectId);
  const authUser = useAppSelector(selectAuthUser);

  const projectsListQuery = useProjectsListQuery();
  const projectLookupsQuery = useProjectLookupsQuery();
  const projectDetailQuery = useProjectDetailQuery(selectedProjectId);
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const archiveProjectMutation = useArchiveProjectMutation();
  const restoreProjectMutation = useRestoreProjectMutation();

  const projects = projectsListQuery.data ?? [];
  const users = projectLookupsQuery.data?.assignableUsers ?? [];
  const userRole = authUser?.role ?? 'administrator';

  const projectRows = useMemo<ProjectTableRow[]>(() => {
    const searchText = ui.filters.searchText.trim().toLowerCase();

    return projects
      .filter((project) => {
        const statusMatch =
          ui.filters.statuses.length === 0 ||
          ui.filters.statuses.includes(project.status);
        const readiness = getTimerReadiness(project);
        const readinessMatch =
          ui.filters.readiness.length === 0 ||
          ui.filters.readiness.includes(readiness.readiness);
        const searchMatch =
          searchText.length === 0 ||
          project.name.toLowerCase().includes(searchText) ||
          project.description.toLowerCase().includes(searchText);

        return statusMatch && readinessMatch && searchMatch;
      })
      .map((project) => ({
        ...project,
        ...getTimerReadiness(project),
      }));
  }, [projects, ui.filters]);

  const summaryMetrics = useMemo<ProjectsSummaryMetric[]>(() => {
    const activeProjects = projectRows.filter((project) => project.status === 'active').length;
    const archivedProjects = projectRows.filter((project) => project.status === 'archived').length;
    const timerReadyProjects = projectRows.filter(
      (project) => project.readiness === 'ready'
    ).length;
    const activeAssignments = projectRows.reduce(
      (count, project) => count + project.assignments.length,
      0
    );

    return [
      { label: 'Active projects', value: String(activeProjects) },
      { label: 'Timer ready', value: String(timerReadyProjects) },
      { label: 'Assignments', value: String(activeAssignments) },
      { label: 'Archived', value: String(archivedProjects) },
    ];
  }, [projectRows]);

  const selectedProject = useMemo(() => {
    const listProject =
      projectRows.find((project) => project.id === selectedProjectId) ?? null;

    if (!selectedProjectId) {
      return null;
    }

    const detailProject = projectDetailQuery.data;
    if (detailProject && detailProject.id === selectedProjectId) {
      return {
        ...detailProject,
        ...getTimerReadiness(detailProject),
      };
    }

    return listProject;
  }, [projectDetailQuery.data, projectRows, selectedProjectId]);

  const getPermissions = (project: ProjectTableRow | null): ProjectActionPermissions | null => {
    if (!project) {
      return null;
    }

    const managesProject =
      userRole === 'administrator' ||
      (authUser != null &&
        userRole === 'manager' &&
        project.projectManagers.some((manager) => isSameProjectUser(authUser, manager)));

    return {
      canCreateProject: userRole === 'administrator' || userRole === 'manager',
      canEditProject: managesProject,
      canArchiveProject: managesProject && project.status === 'active',
      canRestoreProject: userRole === 'administrator' && project.status === 'archived',
      canManageAssignments: managesProject,
      canManageManagers: managesProject,
      canManageTasks: managesProject,
    };
  };

  const selectedProjectPermissions = getPermissions(selectedProject);
  const getProjectPermissions = (projectId: string) =>
    getPermissions(projectRows.find((project) => project.id === projectId) ?? null);

  const loadProjectDetail = async (projectId: string) =>
    queryClient.fetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => projectsApi.getProjectDetail(projectId),
    });

  const openProjectDetail = (projectId: string) => {
    dispatch(setSelectedProjectId(projectId));
  };

  const openEditDrawer = async (projectId: string) => {
    dispatch(setSelectedProjectId(projectId));

    const project = await loadProjectDetail(projectId);
    dispatch(populateProjectDraft(project));
    dispatch(openEditProjectDrawer());
  };

  const saveProject = async () => {
    if (ui.draft.id) {
      const updatedProject = await updateProjectMutation.mutateAsync(ui.draft);
      dispatch(populateProjectDraft(updatedProject));
      dispatch(closeProjectDrawer());
      return;
    }

    await createProjectMutation.mutateAsync(ui.draft);
    dispatch(closeProjectDrawer());
  };

  return {
    draft: ui.draft,
    drawerMode: ui.drawerMode,
    isDrawerOpen: ui.isDrawerOpen,
    projectRows,
    readinessFilters: ui.filters.readiness,
    searchText: ui.filters.searchText,
    selectedProject,
    selectedProjectPermissions,
    statusFilters: ui.filters.statuses,
    summaryMetrics,
    userRole,
    users,
    onArchiveProject: (projectId) => {
      void archiveProjectMutation.mutateAsync(projectId);
    },
    onAssignmentUserIdsChange: (value) =>
      dispatch(updateProjectDraftField({ field: 'assignmentUserIds', value })),
    onClearFilters: () => dispatch(clearProjectsFilters()),
    onCloseDrawer: () => dispatch(closeProjectDrawer()),
    onCloseProjectDetail: () => dispatch(setSelectedProjectId(null)),
    onDescriptionChange: (value) =>
      dispatch(updateProjectDraftField({ field: 'description', value })),
    onDraftStatusChange: (value) =>
      dispatch(updateProjectDraftField({ field: 'status', value })),
    getProjectPermissions,
    onNameChange: (value) =>
      dispatch(updateProjectDraftField({ field: 'name', value })),
    onOpenCreate: () => dispatch(openCreateProjectDrawer()),
    onOpenEdit: (projectId) => {
      void openEditDrawer(projectId);
    },
    onOpenProject: (projectId) => openProjectDetail(projectId),
    onProjectManagerUserIdsChange: (value) =>
      dispatch(updateProjectDraftField({ field: 'projectManagerUserIds', value })),
    onReadinessChange: (value) => dispatch(setProjectsReadiness(value)),
    onRestoreProject: (projectId) => {
      void restoreProjectMutation.mutateAsync(projectId);
    },
    onSaveProject: () => {
      void saveProject();
    },
    onSearchTextChange: (value) => dispatch(setProjectsSearchText(value)),
    onStatusChange: (value) => dispatch(setProjectsStatuses(value)),
    onTasksChange: (value: ProjectTaskDraft[]) =>
      dispatch(updateProjectDraftField({ field: 'tasks', value })),
  };
};
