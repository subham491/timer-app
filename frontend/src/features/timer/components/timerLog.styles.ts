import { alpha, type Theme } from '@mui/material/styles';

export const logGroupRadius = 3;

export const getLogGroupPaperSx = (theme: Theme) => ({
  borderRadius: logGroupRadius,
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
});

export const getLogGroupHeaderSx = (theme: Theme) => ({
  px: 2.5,
  py: 1.2,
  bgcolor:
    theme.palette.mode === 'light'
      ? '#e8eff8'
      : alpha(theme.palette.primary.main, 0.12),
  justifyContent: 'space-between',
});

export const logGroupTitleSx = {
  fontWeight: 700,
};

export const getLogRowSx = (theme: Theme, isRunning: boolean) => ({
  px: { xs: 2, sm: 2.5 },
  py: 1.5,
  bgcolor: isRunning
    ? alpha(theme.palette.success.main, 0.06)
    : 'transparent',
  justifyContent: 'space-between',
});

export const logContentSx = {
  minWidth: 0,
  flex: 1,
};

export const logMetaSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const logEntryTitleSx = {
  fontWeight: 700,
};

export const logBadgeSx = (theme: Theme) => ({
  bgcolor: alpha(theme.palette.primary.main, 0.1),
  color: 'primary.main',
  fontWeight: 700,
});

export const logProjectTaskSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const logRangeValueSx = {
  mt: 0.5,
  fontWeight: 600,
};

export const logDurationValueSx = {
  mt: 0.25,
  fontWeight: 700,
};

export const logDurationContainerSx = {
  minWidth: 96,
};

export const logActionsSx = {
  alignItems: { xs: 'flex-start', sm: 'center' },
};
