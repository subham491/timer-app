export type AuthUserRole =
  | 'regularUser'
  | 'manager'
  | 'administrator'
  | 'reportViewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthUserRole;
}

export interface AuthState {
  isAuthenticated: boolean;

  token: string | null;

  user: AuthUser | null;
}
