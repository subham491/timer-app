import type { AuthState, AuthUser, AuthUserRole } from './auth.types';

export const AUTH_STORAGE_KEY = 'timerapp_auth';

const LEGACY_AUTH_STORAGE_KEYS = ['token', 'accessToken', 'timerapp_token'] as const;

interface PersistedAuthState {
  token: string;
  user: AuthUser;
}

const isAuthUserRole = (value: unknown): value is AuthUserRole =>
  value === 'regularUser' ||
  value === 'manager' ||
  value === 'administrator' ||
  value === 'reportViewer';

const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    isAuthUserRole(candidate.role)
  );
};

const isPersistedAuthState = (value: unknown): value is PersistedAuthState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.token === 'string' && isAuthUser(candidate.user);
};

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export const clearLegacyAuthStorage = () => {
  if (!canUseStorage()) {
    return;
  }

  for (const legacyKey of LEGACY_AUTH_STORAGE_KEYS) {
    window.localStorage.removeItem(legacyKey);
  }
};

export const loadPersistedAuthState = (): AuthState | null => {
  if (!canUseStorage()) {
    return null;
  }

  clearLegacyAuthStorage();

  const rawAuthState = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawAuthState) {
    return null;
  }

  try {
    const parsedAuthState = JSON.parse(rawAuthState) as unknown;

    if (!isPersistedAuthState(parsedAuthState)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return {
      isAuthenticated: true,
      token: parsedAuthState.token,
      user: parsedAuthState.user,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const persistAuthState = (authState: Pick<AuthState, 'token' | 'user'>) => {
  if (!canUseStorage() || !authState.token || !authState.user) {
    return;
  }

  clearLegacyAuthStorage();

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: authState.token,
      user: authState.user,
    } satisfies PersistedAuthState)
  );
};

export const clearPersistedAuthState = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  clearLegacyAuthStorage();
};
