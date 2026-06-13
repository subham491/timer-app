import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import type { DatePreset, DateRange } from '../types';

interface ReportsToolbarProps {
  customRange: DateRange;
  dateRange: DateRange;
  isExporting: boolean;
  preset: DatePreset;
  onCustomRangeChange: (range: DateRange) => void;
  onExport: () => void;
  onPresetChange: (preset: DatePreset) => void;
}

const PRESETS: Array<{ label: string; value: DatePreset }> = [
  { label: 'This week', value: 'this_week' },
  { label: 'Last week', value: 'last_week' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
];

const formatDisplayDate = (iso: string) => {
  if (!iso) {
    return '';
  }

  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

export const ReportsToolbar = ({
  customRange,
  dateRange,
  isExporting,
  preset,
  onCustomRangeChange,
  onExport,
  onPresetChange,
}: ReportsToolbarProps) => (
  <Stack spacing={2}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Reports
        </Typography>
        {dateRange.startDate && dateRange.endDate ? (
          <Typography variant="body2" color="text.secondary">
            {formatDisplayDate(dateRange.startDate)}
            {' - '}
            {formatDisplayDate(dateRange.endDate)}
          </Typography>
        ) : null}
      </Box>

      <Button
        variant="outlined"
        size="small"
        startIcon={
          isExporting ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <FileDownloadRoundedIcon />
          )
        }
        disabled={isExporting || !dateRange.startDate}
        onClick={onExport}
        sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </Button>
    </Stack>

    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'center' } }}
    >
      <ToggleButtonGroup
        value={preset}
        exclusive
        size="small"
        onChange={(_, value: DatePreset | null) => {
          if (value) {
            onPresetChange(value);
          }
        }}
        sx={{ flexWrap: 'wrap' }}
      >
        {PRESETS.map((presetOption) => (
          <ToggleButton
            key={presetOption.value}
            value={presetOption.value}
            sx={{ px: 1.5, py: 0.6 }}
          >
            {presetOption.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {preset === 'custom' ? (
        <>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', sm: 'block' } }}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              type="date"
              label="From"
              size="small"
              value={customRange.startDate}
              onChange={(event) =>
                onCustomRangeChange({
                  ...customRange,
                  startDate: event.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              type="date"
              label="To"
              size="small"
              value={customRange.endDate}
              onChange={(event) =>
                onCustomRangeChange({
                  ...customRange,
                  endDate: event.target.value,
                })
              }
              slotProps={{
                htmlInput: { min: customRange.startDate },
                inputLabel: { shrink: true },
              }}
              sx={{ width: 160 }}
            />
          </Stack>
        </>
      ) : null}
    </Stack>
  </Stack>
);
