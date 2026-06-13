import { store } from '@/store/store';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  const token = store.getState().auth.token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', ...getAuthHeaders() },
    method: 'GET',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(
      typeof body.detail === 'string'
        ? body.detail
        : `Request failed with status ${response.status}`
    );
  }
  return response.json() as Promise<T>;
};

// The backend uses exclusive end_at < end, so we add one day to include
// the last calendar day the user selected.
const toExclusiveEnd = (isoDate: string): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// ─── Response shapes (match backend exactly) ────────────────────────────────

export interface MySummaryRow {
  project: string;
  task: string;
  entry_count: number;
  actual_duration: number;
}

export interface MySummaryResponse {
  start_date: string;
  end_date: string;
  total_duration_seconds: number;
  rows: MySummaryRow[];
}

export interface MyTimesheetRow {
  date: string;
  project: string;
  task: string;
  work_note: string | null;
  start_at: string;
  end_at: string;
  duration_seconds: number;
  source: 'timer' | 'manual';
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const fetchMySummary = (startDate: string, endDate: string) =>
  getJson<MySummaryResponse>(
    `/reports/my-summary?start_date=${startDate}&end_date=${toExclusiveEnd(endDate)}`
  );

export const fetchMyTimesheet = (startDate: string, endDate: string) =>
  getJson<MyTimesheetRow[]>(
    `/reports/my-timesheet?start_date=${startDate}&end_date=${toExclusiveEnd(endDate)}`
  );

// ─── R-05 · User Activity Summary ────────────────────────────────────────────

export interface UserActivityRow {
  user_id: number;
  display_name: string;
  role_id: number;
  entry_count: number;
  actual_duration: number;
  billable_duration: number;
  non_billable_duration: number;
  active_projects: number;
  last_entry_date: string | null;
}

export const fetchUserActivitySummary = (startDate: string, endDate: string) =>
  getJson<UserActivityRow[]>(
    `/reports/user-activity-summary?start_date=${startDate}&end_date=${toExclusiveEnd(endDate)}`
  );

export const downloadUserActivityCsv = async (
  startDate: string,
  endDate: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/reports/user-activity-summary/export?start_date=${startDate}&end_date=${toExclusiveEnd(endDate)}`,
    { headers: { ...getAuthHeaders() }, method: 'GET' }
  );
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `user-activity-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Uses fetch + blob so the auth header is sent correctly (direct <a href> downloads
// can't set headers, which would break with bearer token auth).
export const downloadTimesheetCsv = async (
  startDate: string,
  endDate: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/reports/my-timesheet/export?start_date=${startDate}&end_date=${toExclusiveEnd(endDate)}`,
    { headers: { ...getAuthHeaders() }, method: 'GET' }
  );
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};