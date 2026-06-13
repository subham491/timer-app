import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarViewWeekRoundedIcon from '@mui/icons-material/CalendarViewWeekRounded';
import TimelapseRoundedIcon from '@mui/icons-material/TimelapseRounded';
import {
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { formatCompactDuration } from '@/features/timer/utils';

interface TodaySummaryCardProps {
  lastSessionDurationSeconds: number | null;
  sessionCount: number;
  weekTotalSeconds: number;
}

interface SummaryItem {
  icon: ReactNode;
  label: string;
  value: string;
}

const paperSx = (theme: Theme) => ({
  width: '100%',
  maxWidth: { xs: '100%', xl: 320 },
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(15,23,42,0.08)'
  }`,
  borderRadius: 3,
  p: { xs: 2, md: 2.5 },
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(31,35,44,0.97) 0%, rgba(38,43,52,0.92) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,248,251,0.98) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 16px 34px rgba(0, 0, 0, 0.24)'
      : '0 14px 30px rgba(15, 23, 42, 0.06)',
});

const itemSx = (theme: Theme) => ({
  borderRadius: 2.5,
  px: 1.75,
  py: 1.4,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.035)'
      : 'rgba(248,250,252,0.88)',
});

const iconSx = (theme: Theme) => ({
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: 2.5,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(144,202,249,0.12)'
      : 'rgba(37,99,235,0.08)',
  color: theme.palette.primary.main,
});

const TodaySummaryCard = ({
  lastSessionDurationSeconds,
  sessionCount,
  weekTotalSeconds,
}: TodaySummaryCardProps) => {
  const items: SummaryItem[] = [
    {
      label: 'Sessions today',
      value: sessionCount.toString(),
      icon: <TimelapseRoundedIcon fontSize="small" />,
    },
    {
      label: 'This week',
      value: formatCompactDuration(weekTotalSeconds),
      icon: <CalendarViewWeekRoundedIcon fontSize="small" />,
    },
    {
      label: 'Last session',
      value:
        lastSessionDurationSeconds === null || lastSessionDurationSeconds <= 0
          ? 'No sessions yet'
          : formatCompactDuration(lastSessionDurationSeconds),
      icon: <AccessTimeRoundedIcon fontSize="small" />,
    },
  ];

  return (
    <Paper elevation={0} sx={paperSx}>
      <Stack spacing={1.75}>
        <Stack spacing={0.75}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Today
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A quick pulse on your workday.
          </Typography>
        </Stack>

        {items.map((item) => (
          <Stack
            key={item.label}
            direction="row"
            spacing={1.5}
            sx={(theme) => ({
              ...itemSx(theme),
              alignItems: 'center',
            })}
          >
            <Box sx={iconSx}>{item.icon}</Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};

export default TodaySummaryCard;
