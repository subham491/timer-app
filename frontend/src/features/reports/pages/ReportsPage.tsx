import { Alert, Box, Paper, Stack, Tab, Tabs } from '@mui/material';

import { useReportsPageState } from '@/features/reports/hooks/useReportsPageState';
import {
  OrgActivityTab,
  ReportsStatCards,
  ReportsToolbar,
  SummaryTab,
  TimesheetTab,
} from '@/features/reports/components';

const ReportsPage = () => {
  const {
    activeTab,
    canViewOrgReport,
    customRange,
    dateRange,
    isExporting,
    isLoading,
    loadError,
    orgActivityRows,
    preset,
    projectTotals,
    summaryRows,
    timesheetGroups,
    totalSeconds,
    totalSessions,
    uniqueProjects,
    onCustomRangeChange,
    onExport,
    onPresetChange,
    onTabChange,
  } = useReportsPageState();

  return (
    <Stack spacing={3}>
      <ReportsToolbar
        customRange={customRange}
        dateRange={dateRange}
        isExporting={isExporting}
        preset={preset}
        onCustomRangeChange={onCustomRangeChange}
        onExport={onExport}
        onPresetChange={onPresetChange}
      />

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      {!canViewOrgReport ? (
        <ReportsStatCards
          isLoading={isLoading}
          totalSeconds={totalSeconds}
          totalSessions={totalSessions}
          uniqueProjects={uniqueProjects}
        />
      ) : null}

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value: 0 | 1 | 2) => onTabChange(value)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
          <Tab label="Summary" />
          <Tab label="Timesheet" />
          {canViewOrgReport ? <Tab label="Org Activity" /> : null}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 ? (
            <SummaryTab
              isLoading={isLoading}
              projectTotals={projectTotals}
              rows={summaryRows}
              totalSeconds={totalSeconds}
            />
          ) : activeTab === 1 ? (
            <TimesheetTab
              groups={timesheetGroups}
              isLoading={isLoading}
            />
          ) : (
            <OrgActivityTab
              isLoading={isLoading}
              rows={orgActivityRows}
            />
          )}
        </Box>
      </Paper>
    </Stack>
  );
};

export default ReportsPage;