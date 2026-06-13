import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Controller } from 'react-hook-form';

import { useTimerEntryForm } from '@/features/timer/hooks';
import type { EntryMode } from '@/features/timer/types';
import { formatDuration } from '@/features/timer/utils';
import type {
  TimerDraft,
  TimerEntry,
} from '@/store/slices/timer/timer.types';

import {
  actionBarSx,
  actionButtonSx,
  billableContainerSx,
  fieldSelectSx,
  getPanelPaperSx,
  modeSwitchesSx,
  panelHeaderSx,
  panelTitleSx,
  primaryValueSx,
  secondaryValueSx,
  secondaryButtonSx,
} from './timerEntryPanel.styles';

interface TimerEntryPanelProps {
  activeEntry: TimerEntry | null;
  draft: TimerDraft;
  editingEntryId: string | null;
  entryMode: EntryMode;
  onBillableChange: (checked: boolean) => void;
  onCancelEdit: () => void;
  onClearDraft: () => void;
  onDescriptionChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onModeChange: (mode: EntryMode) => void;
  onProjectChange: (value: string) => void;
  onSaveManualEntry: () => void;
  onStartDateChange: (value: string) => void;
  onStartOrStopTimer: () => void;
  onStartTimeChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onUpdateEntry: () => void;
  projectOptions: string[];
  taskOptions: string[];
}

const formatRange = (
  startDate: string,
  startTime: string,
  endDate: string | null,
  endTime: string | null
) => {
  const startLabel = `${startDate} ${startTime}`;
  const endLabel = endDate && endTime ? `${endDate} ${endTime}` : 'Now';

  return `${startLabel} - ${endLabel}`;
};

const TimerEntryPanel = ({
  activeEntry,
  draft,
  editingEntryId,
  entryMode,
  onBillableChange,
  onCancelEdit,
  onClearDraft,
  onDescriptionChange,
  onEndDateChange,
  onEndTimeChange,
  onModeChange,
  onProjectChange,
  onSaveManualEntry,
  onStartDateChange,
  onStartOrStopTimer,
  onStartTimeChange,
  onTaskChange,
  onUpdateEntry,
  projectOptions,
  taskOptions,
}: TimerEntryPanelProps) => {
  const theme = useTheme();
  const {
    control,
    errors,
    handleCancelEdit,
    handleEntryUpdate,
    handleManualSave,
    handleModeChange,
    handleReset,
    handleTimerAction,
  } = useTimerEntryForm({
    activeEntry,
    draft,
    onCancelEdit,
    onClearDraft,
    onModeChange,
    onSaveManualEntry,
    onStartOrStopTimer,
    onUpdateEntry,
  });

  return (
    <Paper elevation={0} sx={getPanelPaperSx(theme)}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={panelHeaderSx}
        >
          <Box>
            <Typography variant="h6" sx={panelTitleSx}>
              {editingEntryId ? 'Edit entry' : 'New entry'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Track time your way, with timer or manual mode.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={modeSwitchesSx}>
            <Chip
              label="Timer mode"
              size="small"
              clickable
              color={entryMode === 'timer' ? 'primary' : 'default'}
              variant={entryMode === 'timer' ? 'filled' : 'outlined'}
              onClick={() => handleModeChange('timer')}
            />
            <Chip
              label="Manual mode"
              size="small"
              clickable
              color={entryMode === 'manual' ? 'primary' : 'default'}
              variant={entryMode === 'manual' ? 'filled' : 'outlined'}
              onClick={() => handleModeChange('manual')}
            />
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                label="Note"
                placeholder="What are you working on?"
                value={field.value}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  onDescriptionChange(event.target.value);
                }}
                fullWidth
                size="small"
              />
            )}
          />

          <Controller
            name="project"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Project"
                value={field.value}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  onProjectChange(event.target.value);
                }}
                sx={fieldSelectSx}
                size="small"
                error={Boolean(errors.project)}
                helperText={errors.project?.message}
              >
                {projectOptions.map((project) => (
                  <MenuItem key={project} value={project}>
                    {project}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="task"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Task"
                value={field.value}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  onTaskChange(event.target.value);
                }}
                sx={fieldSelectSx}
                size="small"
                error={Boolean(errors.task)}
                helperText={errors.task?.message}
              >
                {taskOptions.map((task) => (
                  <MenuItem key={task} value={task}>
                    {task}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="billable"
            control={control}
            render={({ field }) => (
              <Stack
                direction="row"
                spacing={1}
                sx={billableContainerSx(theme)}
              >
                <Typography variant="body2" color="text.secondary">
                  Billable
                </Typography>
                <Switch
                  checked={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.checked);
                    onBillableChange(event.target.checked);
                  }}
                />
              </Stack>
            )}
          />
        </Stack>

        {entryMode === 'manual' && (
          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Start date"
                  type="date"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    onStartDateChange(event.target.value);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  error={Boolean(errors.startDate)}
                  helperText={errors.startDate?.message}
                />
              )}
            />

            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Start time"
                  type="time"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    onStartTimeChange(event.target.value);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  error={Boolean(errors.startTime)}
                  helperText={errors.startTime?.message}
                />
              )}
            />

            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <TextField
                  label="End date"
                  type="date"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    onEndDateChange(event.target.value);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  error={Boolean(errors.endDate)}
                  helperText={errors.endDate?.message}
                />
              )}
            />

            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <TextField
                  label="End time"
                  type="time"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    onEndTimeChange(event.target.value);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  error={Boolean(errors.endTime)}
                  helperText={errors.endTime?.message}
                />
              )}
            />
          </Stack>
        )}

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          sx={actionBarSx(theme)}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="h5" sx={primaryValueSx}>
                {activeEntry
                  ? formatDuration(activeEntry.durationSeconds)
                  : '00:00:00'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Range
              </Typography>
              <Typography variant="body2" sx={secondaryValueSx}>
                {activeEntry
                  ? formatRange(
                      activeEntry.startDate,
                      activeEntry.startTime,
                      activeEntry.endDate,
                      activeEntry.endTime
                    )
                  : entryMode === 'manual'
                    ? formatRange(
                        draft.startDate,
                        draft.startTime,
                        draft.endDate,
                        draft.endTime
                      )
                    : `${draft.startDate} ${draft.startTime} - Now`}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            {editingEntryId ? (
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                size="small"
                sx={secondaryButtonSx}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={handleReset}
                size="small"
                sx={secondaryButtonSx}
              >
                Reset
              </Button>
            )}

            {editingEntryId ? (
              <Button
                variant="contained"
                onClick={handleEntryUpdate}
                size="small"
                sx={actionButtonSx}
              >
                Update
              </Button>
            ) : entryMode === 'timer' ? (
              <Button
                variant="contained"
                startIcon={
                  activeEntry ? <StopRoundedIcon /> : <PlayArrowRoundedIcon />
                }
                onClick={handleTimerAction}
                size="small"
                sx={actionButtonSx}
              >
                {activeEntry ? 'Stop' : 'Start'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleManualSave}
                size="small"
                sx={actionButtonSx}
              >
                Save time
              </Button>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default TimerEntryPanel;
