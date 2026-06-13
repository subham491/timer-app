import {
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import type { TimerEntry } from '@/store/slices/timer/timer.types';

import StopSessionModal from './StopSessionModal';
import TimerActions from './TimerActions';
import TimerDisplay from './TimerDisplay';

interface CurrentFocusCardProps {
  activeEntry: TimerEntry | null;
  isPausingTimer: boolean;
  isResumingTimer: boolean;
  isStartingTimer: boolean;
  isStoppingTimer: boolean;
  onPauseTimer: () => void;
  onProjectChange: (value: string) => void;
  onResumeTimer: () => void;
  onStartOrStopTimer: (payload?: {
    billable?: boolean;
    notes?: string;
  }) => void;
  onTaskChange: (value: string) => void;
  project: string;
  projects: string[];
  task: string;
  tasks: string[];
}

const paperSx = (theme: Theme) => ({
  flex: 1,
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

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.25,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
};

const CurrentFocusCard = ({
  activeEntry,
  isPausingTimer,
  isResumingTimer,
  isStartingTimer,
  isStoppingTimer,
  onPauseTimer,
  onProjectChange,
  onResumeTimer,
  onStartOrStopTimer,
  onTaskChange,
  project,
  projects,
  task,
  tasks,
}: CurrentFocusCardProps) => {
  const isRunning = activeEntry?.status === 'running';
  const isPaused = activeEntry?.status === 'paused';
  const hasActiveSession = Boolean(activeEntry);
  const totalSeconds = activeEntry?.durationSeconds ?? 0;
  const selectedProject = activeEntry?.project ?? project;
  const selectedTask = activeEntry?.task ?? task;
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isBillable, setIsBillable] = useState(
    activeEntry?.billable ?? true
  );

  useEffect(() => {
    if (!hasActiveSession) {
      setIsStopModalOpen(false);
      setSessionNotes('');
    }
  }, [hasActiveSession]);

  useEffect(() => {
    if (isStopModalOpen) {
      setIsBillable(activeEntry?.billable ?? true);
    }
  }, [isStopModalOpen, activeEntry?.billable]);

  return (
    <>
      <Paper
        elevation={0}
        sx={(theme) => ({
          ...paperSx(theme),
          ...(hasActiveSession
            ? {
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(144,202,249,0.12)'
                    : 'rgba(37,99,235,0.12)',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 18px 34px rgba(0, 0, 0, 0.26)'
                    : '0 16px 30px rgba(37, 99, 235, 0.08)',
              }
            : null),
        })}
      >
        <Stack spacing={2.25}>
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Current Focus
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveSession
                ? 'A calm workspace for the session already in motion.'
                : 'Choose a project and keep this screen intentionally quiet.'}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Tooltip
              title={hasActiveSession ? 'Stop the timer to change project' : ''}
              placement="top"
            >
              <span>
                <TextField
                  select
                  label="Project"
                  value={selectedProject}
                  onChange={(event) => onProjectChange(event.target.value)}
                  fullWidth
                  size="small"
                  sx={fieldSx}
                  disabled={hasActiveSession}
                >
                  {projects.length === 0 ? (
                    <MenuItem value="" disabled>
                      No projects available
                    </MenuItem>
                  ) : null}
                  {projects.map((projectOption) => (
                    <MenuItem key={projectOption} value={projectOption}>
                      {projectOption}
                    </MenuItem>
                  ))}
                </TextField>
              </span>
            </Tooltip>

            <Tooltip
              title={hasActiveSession ? 'Stop the timer to change task' : ''}
              placement="top"
            >
              <span>
                <TextField
                  select
                  label="Task"
                  value={selectedTask}
                  onChange={(event) => onTaskChange(event.target.value)}
                  fullWidth
                  size="small"
                  sx={fieldSx}
                  disabled={hasActiveSession}
                >
                  {tasks.length === 0 ? (
                    <MenuItem value="" disabled>
                      No tasks available
                    </MenuItem>
                  ) : null}
                  {tasks.map((taskOption) => (
                    <MenuItem key={taskOption} value={taskOption}>
                      {taskOption}
                    </MenuItem>
                  ))}
                </TextField>
              </span>
            </Tooltip>
          </Stack>

          <TimerDisplay
            isPaused={isPaused}
            isRunning={isRunning}
            project={selectedProject}
            task={selectedTask}
            totalSeconds={totalSeconds}
          />
          <Stack
            sx={(theme) => ({
              pt: 1.5,
              borderTop: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(15,23,42,0.08)'
              }`,
            })}
          >
            <TimerActions
              isPaused={isPaused}
              isPausingTimer={isPausingTimer}
              isResumingTimer={isResumingTimer}
              isRunning={isRunning}
              isStartingTimer={isStartingTimer}
              isStoppingTimer={isStoppingTimer}
              onPauseTimer={onPauseTimer}
              onResumeTimer={onResumeTimer}
              onStartTimer={onStartOrStopTimer}
              onStopSession={() => {
                setIsBillable(activeEntry?.billable ?? true);
                setIsStopModalOpen(true);
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <StopSessionModal
        open={isStopModalOpen}
        durationSeconds={totalSeconds}
        project={selectedProject}
        task={selectedTask}
        notes={sessionNotes}
        billable={isBillable}
        onNotesChange={setSessionNotes}
        onBillableChange={setIsBillable}
        onClose={() => setIsStopModalOpen(false)}
        onSave={() => {
          setIsStopModalOpen(false);
          onStartOrStopTimer({
            billable: isBillable,
            notes: sessionNotes,
          });
        }}
      />
    </>
  );
};

export default CurrentFocusCard;