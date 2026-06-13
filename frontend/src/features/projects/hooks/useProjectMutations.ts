import { useMutation, useQueryClient } from '@tanstack/react-query';

import { projectsApi } from '@/features/projects/api/projects.api';
import { projectKeys } from '@/features/projects/hooks/useProjectsQueries';
import type { ProjectsFormDraft } from '@/store/slices/projects/projects.types';

const invalidateProjectQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string | null
) => {
  await queryClient.invalidateQueries({
    queryKey: projectKeys.list(),
  });
  await queryClient.invalidateQueries({
    queryKey: projectKeys.lookups(),
  });

  if (projectId) {
    await queryClient.invalidateQueries({
      queryKey: projectKeys.detail(projectId),
    });
  }
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: ProjectsFormDraft) => projectsApi.createProject(draft),
    onSuccess: async (project) => {
      await invalidateProjectQueries(queryClient, project.id);
    },
  });
};

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: ProjectsFormDraft) => projectsApi.updateProject(draft),
    onSuccess: async (project) => {
      await invalidateProjectQueries(queryClient, project.id);
    },
  });
};

export const useArchiveProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.archiveProject(projectId),
    onSuccess: async (project) => {
      await invalidateProjectQueries(queryClient, project.id);
    },
  });
};

export const useRestoreProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.restoreProject(projectId),
    onSuccess: async (project) => {
      await invalidateProjectQueries(queryClient, project.id);
    },
  });
};
