import { Box, Paper, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { formatDuration } from '@/features/timer/utils';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';

interface TimerHeaderProps {
  todayTotalSeconds: number;
}

const paperSx = (theme: Theme) => ({
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(15,23,42,0.08)'
  }`,
  borderRadius: 3,
  px: { xs: 2, md: 3 },
  py: { xs: 1.75, md: 2.25 },
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(145deg, rgba(30,34,43,0.96) 0%, rgba(38,43,54,0.92) 100%)'
      : 'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 14px 32px rgba(0, 0, 0, 0.24)'
      : '0 12px 28px rgba(15, 23, 42, 0.06)',
});

const TimerHeader = ({
  todayTotalSeconds,
}: TimerHeaderProps) => {
  const authUser = useAppSelector(selectAuthUser);
  const currentHour = new Date().getHours();
  const greetingPrefix =
    currentHour >= 5 && currentHour < 12
      ? 'Good Morning'
      : currentHour >= 12 && currentHour < 17
        ? 'Good Afternoon'
        : 'Good Evening';
  const greetingName = authUser?.name?.trim() || 'there';

  return (
    <Paper elevation={0} sx={paperSx}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 650,
              letterSpacing: -0.7,
              fontSize: { xs: '1.65rem', md: '2rem' },
            }}
          >
            {`${greetingPrefix}, ${greetingName}`}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Pick a task. Start focused.
          </Typography>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography variant="body2" color="text.secondary">
            Today
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 650,
              letterSpacing: -0.35,
              fontSize: { xs: '1.35rem', md: '1.55rem' },
            }}
          >
            {formatDuration(todayTotalSeconds)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TimerHeader;
