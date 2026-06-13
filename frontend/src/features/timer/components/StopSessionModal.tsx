import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { formatDuration } from '@/features/timer/utils';

interface StopSessionModalProps {
  billable: boolean;
  durationSeconds: number;
  notes: string;
  onBillableChange: (checked: boolean) => void;
  onClose: () => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  open: boolean;
  project: string;
  task: string;
}

const paperSx = (theme: Theme) => ({
  borderRadius: 3,
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(15,23,42,0.08)'
  }`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(31,35,44,0.98) 0%, rgba(38,43,52,0.96) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,251,0.99) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 20px 40px rgba(0,0,0,0.28)'
      : '0 20px 40px rgba(15,23,42,0.1)',
});

const metaCardSx = (theme: Theme) => ({
  borderRadius: 2.5,
  px: 1.5,
  py: 1.25,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(255,255,255,0.78)',
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15,23,42,0.05)'
  }`,
});

const StopSessionModal = ({
  billable,
  durationSeconds,
  notes,
  onBillableChange,
  onClose,
  onNotesChange,
  onSave,
  open,
  project,
  task,
}: StopSessionModalProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="xs"
    slotProps={{
      paper: {
        sx: paperSx,
      },
    }}
  >
    <DialogTitle sx={{ pb: 1 }}>
      <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
        Complete session
      </Typography>
    </DialogTitle>

    <DialogContent sx={{ pt: 1 }}>
      <Stack spacing={1.5}>
        <Stack spacing={1} sx={(theme) => metaCardSx(theme)}>
          <div>
            <Typography variant="caption" color="text.secondary">
              Final duration
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatDuration(durationSeconds)}
            </Typography>
          </div>

          <div>
            <Typography variant="caption" color="text.secondary">
              Project
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {project}
            </Typography>
          </div>

          <div>
            <Typography variant="caption" color="text.secondary">
              Task
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {task}
            </Typography>
          </div>
        </Stack>

        <TextField
          label="Notes"
          placeholder="Optional session note"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          multiline
          minRows={3}
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1.25}
          sx={(theme) => ({
            ...metaCardSx(theme),
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <div>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Billable
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mark this session as client-billable.
            </Typography>
          </div>
          <Switch
            checked={billable}
            onChange={(event) => onBillableChange(event.target.checked)}
          />
        </Stack>
      </Stack>
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
      <Button
        variant="text"
        onClick={onClose}
        sx={{ borderRadius: 2.5, px: 2 }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        sx={{ borderRadius: 2.5, px: 2.5, boxShadow: 'none' }}
      >
        Save Session
      </Button>
    </DialogActions>
  </Dialog>
);

export default StopSessionModal;