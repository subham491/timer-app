import axios from 'axios';

import type { AuthUser } from '@/store/slices/auth/auth.types';

const authClient = axios.create({ withCredentials: true });

export const fetchMe = async (): Promise<AuthUser | null> => {
  try {
    const { data } = await authClient.get<AuthUser>('/api/auth/me');
    return data;
  } catch {
    return null;
  }
};

export const startLogin = (): void => { window.location.href = '/api/auth/login'; };
export const startDevLogin = (): void => { window.location.href = '/api/auth/dev-login'; };

export const logout = async (): Promise<void> => {
  await authClient.post('/api/auth/logout', null, {
    headers: { 'X-CSRF-Token': document.cookie.match(/csrf_token=([^;]+)/)?.[1] ?? '' },
  });
  window.location.href = '/login';
};

export interface DevUser {
  user_id: number;
  display_name: string;
  email: string;
  role: string;
}

export const fetchDevUsers = async (): Promise<DevUser[]> => {
  const { data } = await authClient.get<DevUser[]>('/api/auth/dev-users');
  return data;
};

export const devLoginAs = (userId: number): void => {
  window.location.href = `/api/auth/dev-login-as?user_id=${userId}`;
};

export const fetchAuthMode = async (): Promise<{ devLogin: boolean }> => {
  try {
    const { data } = await authClient.get<{ devLogin: boolean }>('/api/auth/mode');
    return data;
  } catch {
    return { devLogin: false };   // if unsure, behave like real mode (show the button)
  }
};

// Re-export so existing imports of AuthUser from this module keep working.
export type { AuthUser } from '@/store/slices/auth/auth.types';