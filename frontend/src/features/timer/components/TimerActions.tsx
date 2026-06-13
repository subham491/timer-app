import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import { Button, CircularProgress as MuiCircularProgress, Stack } from '@mui/material';

interface TimerActionsProps {
  isPaused: boolean;
  isPausingTimer: boolean;
  isResumingTimer: boolean;
  isRunning: boolean;
  isStartingTimer: boolean;
  isStoppingTimer: boolean;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStartTimer: () => void;
  onStopSession: () => void;
}

const secondaryButtonSx = {
  minWidth: 148,
  borderRadius: 2.5,
  px: 2.5,
  py: 1,
  fontWeight: 600,
};

const primaryButtonSx = {
  minWidth: 188,
  borderRadius: 2.5,
  px: 3,
  py: 1.05,
  fontWeight: 700,
  boxShadow: 'none',
};

const spinner = (
  <MuiCircularProgress size={16} color="inherit" sx={{ mr: 0.5 }} />
);

const TimerActions = ({
  isPaused,
  isPausingTimer,
  isResumingTimer,
  isRunning,
  isStartingTimer,
  isStoppingTimer,
  onPauseTimer,
  onResumeTimer,
  onStartTimer,
  onStopSession,
}: TimerActionsProps) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={1.25}
    sx={{ justifyContent: 'center' }}
  >
    {isRunning ? (
      <>
        <Button
          variant="outlined"
          size="large"
          startIcon={isPausingTimer ? spinner : <PauseRoundedIcon />}
          onClick={onPauseTimer}
          disabled={isPausingTimer || isStoppingTimer}
          sx={secondaryButtonSx}
        >
          {isPausingTimer ? 'Pausing…' : 'Pause'}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={isStoppingTimer ? spinner : <StopRoundedIcon />}
          onClick={onStopSession}
          disabled={isStoppingTimer || isPausingTimer}
          sx={primaryButtonSx}
        >
          {isStoppingTimer ? 'Stopping…' : 'Stop Session'}
        </Button>
      </>
    ) : isPaused ? (
      <>
        <Button
          variant="outlined"
          size="large"
          startIcon={isResumingTimer ? spinner : <PlayArrowRoundedIcon />}
          onClick={onResumeTimer}
          disabled={isResumingTimer || isStoppingTimer}
          sx={secondaryButtonSx}
        >
          {isResumingTimer ? 'Resuming…' : 'Resume'}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={isStoppingTimer ? spinner : <StopRoundedIcon />}
          onClick={onStopSession}
          disabled={isStoppingTimer || isResumingTimer}
          sx={primaryButtonSx}
        >
          {isStoppingTimer ? 'Stopping…' : 'Stop Session'}
        </Button>
      </>
    ) : (
      <Button
        variant="contained"
        size="large"
        startIcon={isStartingTimer ? spinner : <PlayArrowRoundedIcon />}
        onClick={onStartTimer}
        disabled={isStartingTimer}
        sx={primaryButtonSx}
      >
        {isStartingTimer ? 'Starting…' : 'Start Working'}
      </Button>
    )}
  </Stack>
);

export default TimerActions;