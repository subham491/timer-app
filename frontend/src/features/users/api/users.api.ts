import { apiClient } from '@/shared/lib/apiClient';

import type {
  UserFormDraft,
  UserRecord,
  UserReference,
  UserRoleOption,
} from '@/features/users/types/usersPage.types';

interface BackendUserRoleOption {
  id: number;
  name: UserRoleOption['name'];
  label: string;
  rank: number;
}

interface BackendUserReference {
  id: string;
  userId: number;
  displayName: string;
  email: string;
}

interface BackendUserRecord extends BackendUserReference {
  status: 'active' | 'archived';
  role: BackendUserRoleOption;
  manager: BackendUserReference | null;
  isSelf: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface BackendUsersListResponse {
  items: BackendUserRecord[];
}

interface BackendUserLookupsResponse {
  roles: BackendUserRoleOption[];
  managerCandidates: BackendUserReference[];
}

interface CreateUserRequest {
  display_name: string;
  email: string;
  password: string;
  role_id: number;
  manager_id: number | null;
}

interface UpdateUserRequest {
  display_name?: string;
  email?: string;
  manager_id?: number | null;
}

const mapUserReference = (user: BackendUserReference): UserReference => ({
  id: user.id,
  userId: user.userId,
  displayName: user.displayName,
  email: user.email,
});

const mapUserRole = (role: BackendUserRoleOption): UserRoleOption => ({
  id: role.id,
  name: role.name,
  label: role.label,
  rank: role.rank,
});

const mapUserRecord = (user: BackendUserRecord): UserRecord => ({
  id: user.id,
  userId: user.userId,
  displayName: user.displayName,
  email: user.email,
  status: user.status,
  role: mapUserRole(user.role),
  manager: user.manager ? mapUserReference(user.manager) : null,
  isSelf: user.isSelf,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: user.deletedAt,
});

const getJson = async <TBody>(path: string): Promise<TBody> => {
  const { data } = await apiClient.get<TBody>(path);
  return data;
};

const postJson = async <TRes, TReq>(path: string, body: TReq): Promise<TRes> => {
  const { data } = await apiClient.post<TRes>(path, body);
  return data;
};

const patchJson = async <TRes, TReq>(path: string, body: TReq): Promise<TRes> => {
  const { data } = await apiClient.patch<TRes>(path, body);
  return data;
};

const deleteJson = async (path: string): Promise<void> => {
  await apiClient.delete(path);
};

const toCreatePayload = (draft: UserFormDraft): CreateUserRequest => ({
  display_name: draft.displayName.trim(),
  email: draft.email.trim().toLowerCase(),
  password: draft.password,
  role_id: draft.roleId,
  manager_id: draft.managerId,
});

const toUpdatePayload = (draft: UserFormDraft): UpdateUserRequest => ({
  display_name: draft.displayName.trim(),
  email: draft.email.trim().toLowerCase(),
  manager_id: draft.managerId,
});

export const usersApi = {
  createUser: async (draft: UserFormDraft): Promise<UserRecord> => {
    const response = await postJson<BackendUserRecord, CreateUserRequest>(
      '/users',
      toCreatePayload(draft)
    );
    return mapUserRecord(response);
  },
  changeUserRole: async (userId: string, roleId: number): Promise<UserRecord> => {
    const response = await patchJson<BackendUserRecord, { role_id: number }>(
      `/users/${userId}/role`,
      { role_id: roleId }
    );
    return mapUserRecord(response);
  },
  getUserLookups: async () => {
    const response = await getJson<BackendUserLookupsResponse>('/users/lookups');
    return {
      roles: response.roles.map(mapUserRole),
      managerCandidates: response.managerCandidates.map(mapUserReference),
    };
  },
  getUsersList: async (): Promise<UserRecord[]> => {
    const response = await getJson<BackendUsersListResponse>('/users');
    return response.items.map(mapUserRecord);
  },
  softDeleteUser: async (userId: string): Promise<void> => {
    await deleteJson(`/users/${userId}`);
  },
  updateUser: async (draft: UserFormDraft): Promise<UserRecord> => {
    if (!draft.id) {
      throw new Error('User id is required for update.');
    }

    const response = await patchJson<BackendUserRecord, UpdateUserRequest>(
      `/users/${draft.id}`,
      toUpdatePayload(draft)
    );
    return mapUserRecord(response);
  },
};
