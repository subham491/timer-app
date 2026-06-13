import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usersApi } from '@/features/users/api/users.api';
import { userKeys } from '@/features/users/hooks/useUsersQueries';
import type { UserFormDraft } from '@/features/users/types/usersPage.types';

const invalidateUserQueries = async (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  await queryClient.invalidateQueries({
    queryKey: userKeys.list(),
  });
  await queryClient.invalidateQueries({
    queryKey: userKeys.lookups(),
  });
};

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: UserFormDraft) => usersApi.createUser(draft),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: UserFormDraft) => usersApi.updateUser(draft),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
};

export const useChangeUserRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: number }) =>
      usersApi.changeUserRole(userId, roleId),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
};

export const useSoftDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.softDeleteUser(userId),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
};
