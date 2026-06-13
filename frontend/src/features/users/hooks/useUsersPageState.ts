import { useDeferredValue, useMemo, useState } from 'react';

import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import { useAppSelector } from '@/store/hooks';

import {
  useChangeUserRoleMutation,
  useCreateUserMutation,
  useSoftDeleteUserMutation,
  useUpdateUserMutation,
} from '@/features/users/hooks/useUserMutations';
import { useUserLookupsQuery, useUsersListQuery } from '@/features/users/hooks/useUsersQueries';
import type {
  UserFormDraft,
  UserRecord,
  UsersSummaryMetric,
} from '@/features/users/types/usersPage.types';

const createEmptyDraft = (): UserFormDraft => ({
  id: null,
  userId: null,
  displayName: '',
  email: '',
  password: '',
  roleId: 1,
  initialRoleId: 1,
  managerId: null,
  initialManagerId: null,
  initialDisplayName: '',
  initialEmail: '',
  isSelf: false,
});

const createDraftFromUser = (user: UserRecord): UserFormDraft => ({
  id: user.id,
  userId: user.userId,
  displayName: user.displayName,
  email: user.email,
  password: '',
  roleId: user.role.id,
  initialRoleId: user.role.id,
  managerId: user.manager?.userId ?? null,
  initialManagerId: user.manager?.userId ?? null,
  initialDisplayName: user.displayName,
  initialEmail: user.email,
  isSelf: user.isSelf,
});

const sortUsers = (users: UserRecord[]) =>
  [...users].sort((left, right) => left.displayName.localeCompare(right.displayName));

const ROLE_DISPLAY_ORDER = [1, 3, 2, 4];

export const useUsersPageState = () => {
  const authUser = useAppSelector(selectAuthUser);
  const usersListQuery = useUsersListQuery();
  const userLookupsQuery = useUserLookupsQuery();
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const changeUserRoleMutation = useChangeUserRoleMutation();
  const softDeleteUserMutation = useSoftDeleteUserMutation();

  const [searchText, setSearchText] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [draft, setDraft] = useState<UserFormDraft>(createEmptyDraft());

  const deferredSearchText = useDeferredValue(searchText.trim().toLowerCase());

  const userRole = authUser?.role ?? 'regularUser';
  const canManageUsers = userRole === 'administrator';
  const users = usersListQuery.data ?? [];
  const roleOptions = useMemo(
    () =>
      [...(userLookupsQuery.data?.roles ?? [])].sort(
        (left, right) =>
          ROLE_DISPLAY_ORDER.indexOf(left.id) - ROLE_DISPLAY_ORDER.indexOf(right.id)
      ),
    [userLookupsQuery.data?.roles]
  );
  const managerCandidates = userLookupsQuery.data?.managerCandidates ?? [];

  const filteredUsers = useMemo(() => {
    return sortUsers(
      users.filter((user) => {
        const matchesRole =
          selectedRoleIds.length === 0 || selectedRoleIds.includes(user.role.id);
        const matchesSearch =
          deferredSearchText.length === 0 ||
          user.displayName.toLowerCase().includes(deferredSearchText) ||
          user.email.toLowerCase().includes(deferredSearchText) ||
          user.role.label.toLowerCase().includes(deferredSearchText) ||
          (user.manager?.displayName.toLowerCase().includes(deferredSearchText) ?? false);

        return matchesRole && matchesSearch;
      })
    );
  }, [deferredSearchText, selectedRoleIds, users]);

  const summaryMetrics = useMemo<UsersSummaryMetric[]>(() => {
    return [
      { label: 'Users', value: String(users.length) },
      {
        label: 'Admins',
        value: String(users.filter((user) => user.role.name === 'administrator').length),
      },
      {
        label: 'Managers',
        value: String(users.filter((user) => user.role.name === 'manager').length),
      },
      {
        label: 'Report viewers',
        value: String(users.filter((user) => user.role.name === 'report_viewer').length),
      },
    ];
  }, [users]);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setDraft(createEmptyDraft());
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (user: UserRecord) => {
    setDrawerMode('edit');
    setDraft(createDraftFromUser(user));
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const setDraftField = <TField extends keyof UserFormDraft>(
    field: TField,
    value: UserFormDraft[TField]
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const saveUser = async () => {
    if (!canManageUsers) {
      return;
    }

    if (draft.id == null) {
      await createUserMutation.mutateAsync(draft);
      closeDrawer();
      return;
    }

    const hasProfileChanges =
      draft.displayName.trim() !== draft.initialDisplayName.trim() ||
      draft.email.trim().toLowerCase() !== draft.initialEmail.trim().toLowerCase() ||
      draft.managerId !== draft.initialManagerId;

    const hasRoleChanges = draft.roleId !== draft.initialRoleId;

    if (hasProfileChanges) {
      await updateUserMutation.mutateAsync(draft);
    }

    if (hasRoleChanges) {
      await changeUserRoleMutation.mutateAsync({
        userId: draft.id,
        roleId: draft.roleId,
      });
    }

    closeDrawer();
  };

  return {
    canManageUsers,
    drawerMode,
    draft,
    filteredUsers,
    isDrawerOpen,
    managerCandidates,
    roleOptions,
    searchText,
    selectedRoleIds,
    summaryMetrics,
    userRole,
    onCloseDrawer: closeDrawer,
    onDeleteUser: async (userId: string) => {
      if (!canManageUsers) {
        return;
      }
      await softDeleteUserMutation.mutateAsync(userId);
    },
    onDraftDisplayNameChange: (value: string) => setDraftField('displayName', value),
    onDraftEmailChange: (value: string) => setDraftField('email', value),
    onDraftPasswordChange: (value: string) => setDraftField('password', value),
    onDraftManagerIdChange: (value: number | null) => setDraftField('managerId', value),
    onDraftRoleIdChange: (value: number) =>
      setDraft((currentDraft) => ({
        ...currentDraft,
        roleId: value,
        managerId: value === 1 ? currentDraft.managerId : null,
      })),
    onOpenCreate: openCreateDrawer,
    onOpenEdit: openEditDrawer,
    onRoleFilterChange: setSelectedRoleIds,
    onSaveUser: () => {
      void saveUser();
    },
    onSearchTextChange: setSearchText,
  };
};
