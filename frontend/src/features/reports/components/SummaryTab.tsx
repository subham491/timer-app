import {
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import { formatCompactDuration } from '@/features/timer/utils';
import type { MySummaryRow } from '../api/reports.api';
import type { ProjectTotal } from '../types';

interface ProjectBarsProps {
  isLoading: boolean;
  projectTotals: ProjectTotal[];
  totalSeconds: number;
}

const ProjectBars = ({
  isLoading,
  projectTotals,
  totalSeconds,
}: ProjectBarsProps) => {
  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        {[100, 74, 52, 38].map((width) => (
          <Stack
            key={width}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Skeleton width={120} height={16} />
            <Skeleton
              width={`${width}%`}
              height={10}
              sx={{ borderRadius: 4, flex: 1, maxWidth: `${width}%` }}
            />
            <Skeleton width={52} height={16} />
          </Stack>
        ))}
      </Stack>
    );
  }

  if (projectTotals.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data for this period.
      </Typography>
    );
  }

  const colors = ['#1565C0', '#1976D2', '#42A5F5', '#90CAF9', '#BBDEFB'];

  return (
    <Stack spacing={1.5}>
      {projectTotals.map((projectTotal, index) => (
        <Stack
          key={projectTotal.project}
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center' }}
        >
          <Tooltip title={projectTotal.project} placement="top">
            <Typography
              variant="body2"
              sx={{
                width: 140,
                flexShrink: 0,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projectTotal.project}
            </Typography>
          </Tooltip>

          <Box
            sx={{
              flex: 1,
              height: 10,
              bgcolor: 'action.hover',
              borderRadius: 4,
            }}
          >
            <Box
              sx={{
                width: `${projectTotal.pct}%`,
                minWidth: projectTotal.pct > 0 ? 4 : 0,
                height: '100%',
                borderRadius: 4,
                bgcolor: colors[index % colors.length],
                transition: 'width 0.4s ease',
              }}
            />
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ width: 64, textAlign: 'right', flexShrink: 0 }}
          >
            {formatCompactDuration(projectTotal.seconds)}
          </Typography>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ width: 36, textAlign: 'right', flexShrink: 0 }}
          >
            {projectTotal.pct}%
          </Typography>
        </Stack>
      ))}

      {totalSeconds > 0 ? (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            pt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="body2"
            sx={{ width: 140, flexShrink: 0, fontWeight: 600 }}
          >
            Total
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant="body2"
            sx={{ width: 64, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}
          >
            {formatCompactDuration(totalSeconds)}
          </Typography>
          <Box sx={{ width: 36 }} />
        </Stack>
      ) : null}
    </Stack>
  );
};

interface BreakdownTableProps {
  isLoading: boolean;
  rows: MySummaryRow[];
  totalSeconds: number;
}

const BreakdownTable = ({
  isLoading,
  rows,
  totalSeconds,
}: BreakdownTableProps) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>Project</TableCell>
        <TableCell>Task</TableCell>
        <TableCell align="right">Sessions</TableCell>
        <TableCell align="right">Duration</TableCell>
        <TableCell align="right">Share</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {isLoading
        ? Array.from({ length: 4 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: 5 }).map((__, cellIndex) => (
                <TableCell key={cellIndex}>
                  <Skeleton />
                </TableCell>
              ))}
            </TableRow>
          ))
        : rows.map((row, rowIndex) => {
            const share =
              totalSeconds > 0
                ? Math.round((row.actual_duration / totalSeconds) * 100)
                : 0;

            return (
              <TableRow key={`${row.project}-${row.task}-${rowIndex}`} hover>
                <TableCell>{row.project}</TableCell>
                <TableCell>{row.task}</TableCell>
                <TableCell align="right">{row.entry_count}</TableCell>
                <TableCell align="right">
                  {formatCompactDuration(row.actual_duration)}
                </TableCell>
                <TableCell align="right">{share}%</TableCell>
              </TableRow>
            );
          })}
    </TableBody>
  </Table>
);

interface SummaryTabProps {
  isLoading: boolean;
  projectTotals: ProjectTotal[];
  rows: MySummaryRow[];
  totalSeconds: number;
}

export const SummaryTab = ({
  isLoading,
  projectTotals,
  rows,
  totalSeconds,
}: SummaryTabProps) => (
  <Stack spacing={3}>
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }} gutterBottom>
        Time by project
      </Typography>
      <ProjectBars
        isLoading={isLoading}
        projectTotals={projectTotals}
        totalSeconds={totalSeconds}
      />
    </Box>

    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }} gutterBottom>
        Task breakdown
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <BreakdownTable
          isLoading={isLoading}
          rows={rows}
          totalSeconds={totalSeconds}
        />
      </Box>
    </Box>
  </Stack>
);
