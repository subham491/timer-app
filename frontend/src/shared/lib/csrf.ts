import type { AxiosInstance } from 'axios';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

export function readCsrfToken(): string | null {
  const match = document.cookie.split('; ').find((r) => r.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function attachCsrfInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const method = (config.method ?? 'get').toLowerCase();
    if (!SAFE_METHODS.has(method)) {
      const token = readCsrfToken();
      if (token) config.headers.set?.(CSRF_HEADER, token);
    }
    return config;
  });
}