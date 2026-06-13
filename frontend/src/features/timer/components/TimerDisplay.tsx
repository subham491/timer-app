import { Box, Chip, Stack, Typography } from '@mui/material';

import { formatDuration } from '@/features/timer/utils';

interface TimerDisplayProps {
  isPaused: boolean;
  isRunning: boolean;
  project?: string;
  task?: string;
  totalSeconds: number;
}

const containerSx = () => ({
  alignItems: 'center',
  width: '100%',
  py: { xs: 1.5, md: 1.75 },
  px: { xs: 0.5, md: 0.75 },
  background: 'transparent',
});

const TimerDisplay = ({
  isPaused,
  isRunning,
  project,
  task,
  totalSeconds,
}: TimerDisplayProps) => (
  <Stack
    spacing={1.25}
    sx={containerSx}
  >
    <Chip
      size="small"
      label={
        isRunning
          ? 'In focus'
          : isPaused
            ? 'Paused'
            : 'Ready to start'
      }
      color={isRunning || isPaused ? 'primary' : 'default'}
      variant={isRunning || isPaused ? 'filled' : 'outlined'}
      sx={{
        borderRadius: 2,
        fontWeight: 600,
        px: 0.5,
      }}
    />
    <Typography
      component="div"
      sx={{
        fontSize: { xs: '2.6rem', md: '3.8rem' },
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: { xs: '0.05em', md: '0.08em' },
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'center',
      }}
    >
      {formatDuration(totalSeconds).replaceAll(':', ' : ')}
    </Typography>

    {(isRunning || isPaused) && project && task ? (
      <Stack
        spacing={1}
        sx={{
          width: '100%',
          maxWidth: 360,
          alignItems: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Project
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {project}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Task
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {task}
          </Typography>
        </Box>
      </Stack>
    ) : (
      <Typography variant="caption" color="text.secondary">
        {isRunning
          ? 'Stay in the flow.'
          : isPaused
            ? 'Take a breath. Resume when ready.'
            : 'One clear session at a time.'}
      </Typography>
    )}
  </Stack>
);

export default TimerDisplay;
