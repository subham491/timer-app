import type { MySummaryRow, MyTimesheetRow, UserActivityRow } from '../api/reports.api';

export type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  endDate: string;
  startDate: string;
}

export interface ProjectTotal {
  project: string;
  seconds: number;
  pct: number;
}

export interface TimesheetGroup {
  date: string;
  entries: MyTimesheetRow[];
  totalSeconds: number;
}

export interface UseReportsPageStateResult {
  activeTab: 0 | 1 | 2;
  canViewOrgReport: boolean;
  customRange: DateRange;
  dateRange: DateRange;
  isExporting: boolean;
  isLoading: boolean;
  loadError: string | null;
  orgActivityRows: UserActivityRow[];
  preset: DatePreset;
  projectTotals: ProjectTotal[];
  summaryRows: MySummaryRow[];
  timesheetGroups: TimesheetGroup[];
  totalSeconds: number;
  totalSessions: number;
  uniqueProjects: number;
  onCustomRangeChange: (range: DateRange) => void;
  onExport: () => void;
  onPresetChange: (preset: DatePreset) => void;
  onTabChange: (tab: 0 | 1 | 2) => void;
}

export type { UserActivityRow };