import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { formatDuration } from '@/features/timer/utils';
import type { TimerEntry } from '@/store/slices/timer/timer.types';

import {
  getLogRowSx,
  logActionsSx,
  logBadgeSx,
  logContentSx,
  logDurationContainerSx,
  logDurationValueSx,
  logEntryTitleSx,
  logMetaSx,
  logProjectTaskSx,
  logRangeValueSx,
} from './timerLog.styles';

interface TimerLogRowProps {
  activeEntryId: string | null;
  entry: TimerEntry;
  onEdit: (entryId: string) => void;
  onResume: (entryId: string) => void;
}

const formatRange = (
  startDate: string,
  startTime: string,
  endDate: string | null,
  endTime: string | null
) => {
  const startLabel = `${startDate} ${startTime}`;
  const endLabel =
    endDate && endTime
      ? `${endDate} ${endTime}`
      : 'Now';

  return `${startLabel} - ${endLabel}`;
};

const TimerLogRow = ({
  activeEntryId,
  entry,
  onEdit,
  onResume,
}: TimerLogRowProps) => {
  const theme = useTheme();

  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      spacing={1.5}
      sx={getLogRowSx(theme, entry.status === 'running')}
    >
      <Stack spacing={1.25} sx={logContentSx}>
        <Stack direction="row" spacing={1} sx={logMetaSx}>
          <Chip
            label={entry.id.split('-').pop()}
            size="small"
            sx={logBadgeSx(theme)}
          />
          <Chip
            label={entry.billable ? 'Billable' : 'Internal'}
            size="small"
            color={entry.billable ? 'primary' : 'default'}
            variant={entry.billable ? 'filled' : 'outlined'}
          />
          {entry.status === 'running' && (
            <Chip label="Running" size="small" color="success" />
          )}
        </Stack>

        <Typography variant="subtitle1" sx={logEntryTitleSx}>
          {entry.description}
        </Typography>

        <Stack direction="row" spacing={1.5} sx={logProjectTaskSx}>
          <Typography variant="body2">{entry.project}</Typography>
          <Typography variant="body2" color="text.secondary">
            {entry.task}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={logActionsSx}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Range
          </Typography>
          <Typography variant="body2" sx={logRangeValueSx}>
            {formatRange(
              entry.startDate,
              entry.startTime,
              entry.endDate,
              entry.endTime
            )}
          </Typography>
        </Box>

        <Box sx={logDurationContainerSx}>
          <Typography variant="caption" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="subtitle1" sx={logDurationValueSx}>
            {formatDuration(entry.durationSeconds)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PlayArrowRoundedIcon />}
            size="small"
            disabled={entry.status === 'running' || Boolean(activeEntryId)}
            onClick={() => onResume(entry.id)}
          >
            Resume
          </Button>

          <Button
            variant="text"
            size="small"
            disabled={entry.status === 'running'}
            onClick={() => onEdit(entry.id)}
          >
            Edit
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default TimerLogRow;
