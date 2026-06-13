import { useQuery } from '@tanstack/react-query';

import { usersApi } from '@/features/users/api/users.api';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  lookups: () => [...userKeys.all, 'lookups'] as const,
};

export const useUsersListQuery = () =>
  useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.getUsersList(),
  });

export const useUserLookupsQuery = () =>
  useQuery({
    queryKey: userKeys.lookups(),
    queryFn: () => usersApi.getUserLookups(),
  });
