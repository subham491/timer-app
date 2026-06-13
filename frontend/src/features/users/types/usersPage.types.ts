export interface UserRoleOption {
  id: number;
  name: 'user' | 'report_viewer' | 'manager' | 'administrator';
  label: string;
  rank: number;
}

export interface UserReference {
  id: string;
  userId: number;
  displayName: string;
  email: string;
}

export interface UserRecord extends UserReference {
  status: 'active' | 'archived';
  role: UserRoleOption;
  manager: UserReference | null;
  isSelf: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserFormDraft {
  id: string | null;
  userId: number | null;
  displayName: string;
  email: string;
  password: string;
  roleId: number;
  initialRoleId: number;
  managerId: number | null;
  initialManagerId: number | null;
  initialDisplayName: string;
  initialEmail: string;
  isSelf: boolean;
}

export interface UsersSummaryMetric {
  label: string;
  value: string;
}
