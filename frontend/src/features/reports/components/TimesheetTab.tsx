import {
  Box,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import { formatCompactDuration, formatDuration } from '@/features/timer/utils';
import type { MyTimesheetRow } from '../api/reports.api';
import type { TimesheetGroup } from '../types';

const formatTimeRange = (startAt: string, endAt: string): string => {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  return `${formatTime(startAt)} - ${formatTime(endAt)}`;
};

const formatGroupDate = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

interface EntryRowProps {
  durationSeconds: number;
  endAt: string;
  project: string;
  source: 'timer' | 'manual';
  startAt: string;
  task: string;
  workNote: string | null;
}

const EntryRow = ({
  durationSeconds,
  endAt,
  project,
  source,
  startAt,
  task,
  workNote,
}: EntryRowProps) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={{ xs: 0.5, sm: 2 }}
    sx={{
      py: 1.25,
      px: 2,
      alignItems: { sm: 'flex-start' },
      '&:hover': { bgcolor: 'action.hover' },
      borderRadius: 1,
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {task}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {project}
        </Typography>
        {source === 'manual' ? (
          <Chip
            label="manual"
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: 10 }}
          />
        ) : null}
      </Stack>
      {workNote ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 0.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 420,
          }}
        >
          {workNote}
        </Typography>
      ) : null}
    </Box>

    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.25 } }}
    >
      {formatTimeRange(startAt, endAt)}
    </Typography>

    <Typography
      variant="body2"
      sx={{
        flexShrink: 0,
        minWidth: 64,
        textAlign: 'right',
        mt: { xs: 0, sm: 0.1 },
        fontWeight: 500,
      }}
    >
      {formatDuration(durationSeconds)}
    </Typography>
  </Stack>
);

const DateGroup = ({ group }: { group: TimesheetGroup }) => (
  <Box>
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        bgcolor: 'action.hover',
        borderRadius: 1,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase' }}
      >
        {formatGroupDate(group.date)}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {formatCompactDuration(group.totalSeconds)}
      </Typography>
    </Stack>

    <Stack divider={<Divider sx={{ mx: 2 }} />}>
      {group.entries.map((entry: MyTimesheetRow, index: number) => (
        <EntryRow
          key={`${entry.start_at}-${entry.task}-${index}`}
          durationSeconds={entry.duration_seconds}
          endAt={entry.end_at}
          project={entry.project}
          source={entry.source}
          startAt={entry.start_at}
          task={entry.task}
          workNote={entry.work_note}
        />
      ))}
    </Stack>
  </Box>
);

interface TimesheetTabProps {
  groups: TimesheetGroup[];
  isLoading: boolean;
}

export const TimesheetTab = ({ groups, isLoading }: TimesheetTabProps) => {
  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        {[3, 2, 4].map((count, groupIndex) => (
          <Box key={groupIndex}>
            <Skeleton width={240} height={32} sx={{ mb: 0.5 }} />
            {Array.from({ length: count }).map((_, entryIndex) => (
              <Stack
                key={entryIndex}
                direction="row"
                spacing={2}
                sx={{ py: 1, px: 2 }}
              >
                <Skeleton width={180} />
                <Box sx={{ flex: 1 }} />
                <Skeleton width={80} />
                <Skeleton width={56} />
              </Stack>
            ))}
          </Box>
        ))}
      </Stack>
    );
  }

  if (groups.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No sessions logged in this period.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {groups.map((group) => (
        <DateGroup key={group.date} group={group} />
      ))}
    </Stack>
  );
};
