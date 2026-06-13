import { Divider, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { TimerEntry } from '@/store/slices/timer/timer.types';

import {
  getLogGroupHeaderSx,
  getLogGroupPaperSx,
  logGroupTitleSx,
} from './timerLog.styles';
import TimerLogRow from './TimerLogRow';

interface TimerLogGroupProps {
  activeEntryId: string | null;
  entries: TimerEntry[];
  label: string;
  onEdit: (entryId: string) => void;
  onResume: (entryId: string) => void;
  totalLabel: string;
}

const TimerLogGroup = ({
  activeEntryId,
  entries,
  label,
  onEdit,
  onResume,
  totalLabel,
}: TimerLogGroupProps) => {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={getLogGroupPaperSx(theme)}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={getLogGroupHeaderSx(theme)}
      >
        <Typography variant="subtitle1" sx={logGroupTitleSx}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalLabel}
        </Typography>
      </Stack>

      <Stack divider={<Divider flexItem />}>
        {entries.map((entry) => (
          <TimerLogRow
            key={entry.id}
            activeEntryId={activeEntryId}
            entry={entry}
            onEdit={onEdit}
            onResume={onResume}
          />
        ))}
      </Stack>
    </Paper>
  );
};

export default TimerLogGroup;
