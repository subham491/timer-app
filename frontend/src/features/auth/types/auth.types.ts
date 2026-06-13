import type { AuthUserRole } from '@/store/slices/auth/auth.types';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: AuthUserRole;
  } | null;
}
