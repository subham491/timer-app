import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Button,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useMemo, useState } from 'react';

import { validateTimerDraft } from '@/features/timer/validations';
import { formatDuration } from '@/features/timer/utils';
import type { TimerDraft } from '@/store/slices/timer/timer.types';

interface TimerEntryDrawerProps {
  draft: TimerDraft;
  editingEntryId: string | null;
  onBillableChange: (checked: boolean) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onSaveManualEntry: () => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onUpdateEntry: () => void;
  open: boolean;
  projectOptions: string[];
  taskOptions: string[];
}

const paperSx = (theme: Theme) => ({
  width: '100%',
  maxWidth: 460,
  px: { xs: 2, sm: 2.5 },
  py: 2.25,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(26,29,36,0.99) 0%, rgba(33,37,46,0.97) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,251,0.99) 100%)',
});

const sectionSx = (theme: Theme) => ({
  borderRadius: 2.5,
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(15,23,42,0.07)'
  }`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(255,255,255,0.82)',
  px: 1.5,
  py: 1.25,
});

const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

const TimerEntryDrawer = ({
  draft,
  editingEntryId,
  onBillableChange,
  onClose,
  onDescriptionChange,
  onEndDateChange,
  onEndTimeChange,
  onProjectChange,
  onSaveManualEntry,
  onStartDateChange,
  onStartTimeChange,
  onTaskChange,
  onUpdateEntry,
  open,
  projectOptions,
  taskOptions,
}: TimerEntryDrawerProps) => {
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(
    () => (showErrors ? validateTimerDraft(draft) : {}),
    [draft, showErrors]
  );

  const calculatedDurationSeconds = useMemo(() => {
    const start = toDateTime(draft.startDate, draft.startTime);
    const end = toDateTime(draft.endDate, draft.endTime);

    return Math.max(
      Math.floor((end.getTime() - start.getTime()) / 1000),
      0
    );
  }, [draft.endDate, draft.endTime, draft.startDate, draft.startTime]);

  const handleSubmit = () => {
    const nextErrors = validateTimerDraft(draft);
    setShowErrors(true);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (editingEntryId) {
      onUpdateEntry();
    } else {
      onSaveManualEntry();
    }

    setShowErrors(false);
    onClose();
  };

  const handleClose = () => {
    setShowErrors(false);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{ paper: { sx: paperSx } }}
    >
      <Stack spacing={2.25}>
        <Stack
          direction="row"
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingEntryId ? 'Edit Entry' : 'Manual Entry'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editingEntryId
                ? 'Update a completed session without changing its identity.'
                : 'Add completed time as a secondary workflow.'}
            </Typography>
          </Box>

          <IconButton onClick={handleClose} size="small">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack spacing={1.5}>
          <TextField
            select
            label="Project"
            value={draft.project}
            onChange={(event) => onProjectChange(event.target.value)}
            error={Boolean(errors.project)}
            helperText={errors.project}
            size="small"
            fullWidth
          >
            {projectOptions.length === 0 ? (
              <MenuItem value="" disabled>
                No projects available
              </MenuItem>
            ) : null}
            {projectOptions.map((projectOption) => (
              <MenuItem key={projectOption} value={projectOption}>
                {projectOption}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Task"
            value={draft.task}
            onChange={(event) => onTaskChange(event.target.value)}
            error={Boolean(errors.task)}
            helperText={errors.task}
            size="small"
            fullWidth
          >
            {taskOptions.length === 0 ? (
              <MenuItem value="" disabled>
                No tasks available
              </MenuItem>
            ) : null}
            {taskOptions.map((taskOption) => (
              <MenuItem key={taskOption} value={taskOption}>
                {taskOption}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Start Date"
              type="date"
              value={draft.startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              error={Boolean(errors.startDate)}
              helperText={errors.startDate}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Start Time"
              type="time"
              value={draft.startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              error={Boolean(errors.startTime)}
              helperText={errors.startTime}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="End Date"
              type="date"
              value={draft.endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              error={Boolean(errors.endDate)}
              helperText={errors.endDate}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="End Time"
              type="time"
              value={draft.endTime}
              onChange={(event) => onEndTimeChange(event.target.value)}
              error={Boolean(errors.endTime)}
              helperText={errors.endTime}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <TextField
            label="Notes"
            placeholder="What was completed?"
            value={draft.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            size="small"
          />

          <Box sx={(theme) => sectionSx(theme)}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.billable}
                  onChange={(event) =>
                    onBillableChange(event.target.checked)
                  }
                />
              }
              label="Billable"
              sx={{ m: 0 }}
            />
          </Box>

          <Box sx={(theme) => sectionSx(theme)}>
            <Typography variant="caption" color="text.secondary">
              Duration preview
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatDuration(calculatedDurationSeconds)}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.25}
          sx={{ justifyContent: 'flex-end' }}
        >
          <Button variant="text" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ boxShadow: 'none' }}>
            {editingEntryId ? 'Save Changes' : 'Save Entry'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export default TimerEntryDrawer;
