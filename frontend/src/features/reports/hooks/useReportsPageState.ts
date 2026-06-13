import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  downloadTimesheetCsv,
  downloadUserActivityCsv,
  fetchMySummary,
  fetchMyTimesheet,
  fetchUserActivitySummary,
} from '../api/reports.api';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import type {
  DatePreset,
  DateRange,
  ProjectTotal,
  TimesheetGroup,
  UseReportsPageStateResult,
} from '../types';

// ─── Date range helpers ──────────────────────────────────────────────────────

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const thisMonday = (from: Date): Date => {
  const d = new Date(from);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const getPresetRange = (preset: DatePreset, now: Date): DateRange => {
  switch (preset) {
    case 'this_week': {
      const mon = thisMonday(now);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { startDate: isoDate(mon), endDate: isoDate(sun) };
    }
    case 'last_week': {
      const mon = thisMonday(now);
      const lastMon = new Date(mon);
      lastMon.setDate(mon.getDate() - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      return { startDate: isoDate(lastMon), endDate: isoDate(lastSun) };
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: isoDate(first), endDate: isoDate(last) };
    }
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: isoDate(first), endDate: isoDate(last) };
    }
    default:
      return { startDate: isoDate(now), endDate: isoDate(now) };
  }
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useReportsPageState = (): UseReportsPageStateResult => {
  const authUser = useAppSelector(selectAuthUser);

  // report_viewer and administrator can access org-wide R-05
  const canViewOrgReport =
    authUser?.role === 'reportViewer' || authUser?.role === 'administrator';

  const [preset, setPreset] = useState<DatePreset>('this_week');
  const [customRange, setCustomRange] = useState<DateRange>({ startDate: '', endDate: '' });
  // Org viewers default to the org tab (tab index 2)
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(canViewOrgReport ? 2 : 0);
  const [isExporting, setIsExporting] = useState(false);

  const dateRange = useMemo<DateRange>(() => {
    if (preset === 'custom') return customRange;
    return getPresetRange(preset, new Date());
  }, [preset, customRange]);

  const { startDate, endDate } = dateRange;
  const rangeReady = Boolean(startDate && endDate);

  // Personal reports (all roles)
  const summaryQuery = useQuery({
    queryKey: ['reports-summary', startDate, endDate],
    queryFn: () => fetchMySummary(startDate, endDate),
    enabled: rangeReady,
    staleTime: 60_000,
  });

  const timesheetQuery = useQuery({
    queryKey: ['reports-timesheet', startDate, endDate],
    queryFn: () => fetchMyTimesheet(startDate, endDate),
    enabled: rangeReady,
    staleTime: 60_000,
  });

  // Org report — only fetched when the user has the right role
  const orgActivityQuery = useQuery({
    queryKey: ['reports-org-activity', startDate, endDate],
    queryFn: () => fetchUserActivitySummary(startDate, endDate),
    enabled: rangeReady && canViewOrgReport,
    staleTime: 60_000,
  });

  const timesheetGroups = useMemo<TimesheetGroup[]>(() => {
    const rows = timesheetQuery.data ?? [];
    const map: Record<string, TimesheetGroup> = {};
    for (const row of rows) {
      if (!map[row.date]) {
        map[row.date] = { date: row.date, entries: [], totalSeconds: 0 };
      }
      map[row.date].entries.push(row);
      map[row.date].totalSeconds += row.duration_seconds;
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [timesheetQuery.data]);

  const projectTotals = useMemo<ProjectTotal[]>(() => {
    const rows = summaryQuery.data?.rows ?? [];
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.project] = (map[row.project] ?? 0) + row.actual_duration;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([project, seconds]) => ({
        project,
        seconds,
        pct: total > 0 ? Math.round((seconds / total) * 100) : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [summaryQuery.data]);

  const totalSeconds = summaryQuery.data?.total_duration_seconds ?? 0;
  const totalSessions = timesheetQuery.data?.length ?? 0;
  const uniqueProjects = projectTotals.length;

  const loadError =
    (summaryQuery.error as Error | null)?.message ??
    (timesheetQuery.error as Error | null)?.message ??
    (orgActivityQuery.error as Error | null)?.message ??
    null;

  const isLoading =
    summaryQuery.isLoading ||
    timesheetQuery.isLoading ||
    (canViewOrgReport && orgActivityQuery.isLoading);

  const handleExport = async () => {
    if (!rangeReady) return;
    setIsExporting(true);
    try {
      if (activeTab === 2 && canViewOrgReport) {
        await downloadUserActivityCsv(startDate, endDate);
      } else {
        await downloadTimesheetCsv(startDate, endDate);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return {
    activeTab,
    canViewOrgReport,
    customRange,
    dateRange,
    isExporting,
    isLoading,
    loadError,
    orgActivityRows: orgActivityQuery.data ?? [],
    preset,
    projectTotals,
    summaryRows: summaryQuery.data?.rows ?? [],
    timesheetGroups,
    totalSeconds,
    totalSessions,
    uniqueProjects,
    onCustomRangeChange: setCustomRange,
    onExport: () => { void handleExport(); },
    onPresetChange: setPreset,
    onTabChange: setActiveTab,
  };
};