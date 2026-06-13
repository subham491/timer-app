import { useQuery } from '@tanstack/react-query';

import { projectsApi } from '@/features/projects/api/projects.api';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (projectId: string) => [...projectKeys.all, 'detail', projectId] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  lookups: () => [...projectKeys.all, 'lookups'] as const,
};

export const useProjectsListQuery = () =>
  useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.getProjectsList(),
  });

export const useProjectLookupsQuery = () =>
  useQuery({
    queryKey: projectKeys.lookups(),
    queryFn: () => projectsApi.getProjectLookups(),
  });

export const useProjectDetailQuery = (projectId: string | null) =>
  useQuery({
    enabled: projectId !== null,
    queryKey: projectId ? projectKeys.detail(projectId) : [...projectKeys.all, 'detail', 'none'],
    queryFn: () => projectsApi.getProjectDetail(projectId ?? ''),
  });
