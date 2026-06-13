import axios, { AxiosError } from 'axios';

import { attachCsrfInterceptor } from '@/shared/lib/csrf';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,                 // send the session + csrf cookies
  headers: { Accept: 'application/json' },
});

// Adds X-CSRF-Token to every non-GET request (reads the csrf_token cookie).
attachCsrfInterceptor(apiClient);

// Preserve the backend's `detail` message so snackbars keep showing it.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === 'string' && detail.length > 0
        ? detail
        : `Backend request failed with status ${error.response?.status ?? 'unknown'}`;
    return Promise.reject(new Error(message));
  }
);