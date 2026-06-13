import { alpha, type Theme } from '@mui/material/styles';

export const getOverviewPaperSx = (theme: Theme) => ({
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  color: theme.palette.mode === 'light' ? 'text.primary' : '#eff6ff',
  background:
    theme.palette.mode === 'light'
      ? theme.palette.background.paper
      : 'linear-gradient(135deg, #020617 0%, #0f172a 55%, #164e63 100%)',
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 12px 28px rgba(15, 23, 42, 0.05)'
      : '0 16px 40px rgba(2, 6, 23, 0.4)',
  border:
    theme.palette.mode === 'light'
      ? `1px solid ${alpha(theme.palette.divider, 0.8)}`
      : 'none',
});

export const overviewLayoutSx = {
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', lg: 'flex-start' },
};

export const overviewContentSx = {
  flex: 1,
  minWidth: 0,
  pr: { lg: 2 },
};

export const getOverviewChipSx = (theme: Theme) => ({
  mb: 1.25,
  bgcolor:
    theme.palette.mode === 'light'
      ? alpha(theme.palette.primary.main, 0.08)
      : alpha('#e0f2fe', 0.12),
  color:
    theme.palette.mode === 'light'
      ? 'primary.main'
      : '#e0f2fe',
  height: 24,
});

export const overviewTitleSx = {
  fontSize: { xs: '1.3rem', md: '1.55rem' },
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: '-0.02em',
};

export const getOverviewDescriptionSx = (theme: Theme) => ({
  mt: 0.75,
  color:
    theme.palette.mode === 'light'
      ? 'text.secondary'
      : alpha('#eff6ff', 0.84),
});

export const overviewStatsSx = {
  mt: { xs: 1.5, lg: 0 },
  width: { xs: '100%', lg: 'auto' },
  minWidth: { lg: 430 },
  flexWrap: { xs: 'wrap', md: 'nowrap' },
};

export const getOverviewStatPaperSx = (theme: Theme) => ({
  p: 1.5,
  borderRadius: 2.5,
  bgcolor:
    theme.palette.mode === 'light'
      ? alpha(theme.palette.primary.main, 0.03)
      : alpha('#ffffff', 0.08),
  border:
    theme.palette.mode === 'light'
      ? `1px solid ${alpha(theme.palette.divider, 0.72)}`
      : `1px solid ${alpha('#ffffff', 0.1)}`,
  color:
    theme.palette.mode === 'light'
      ? 'text.primary'
      : '#f8fafc',
  flex: 1,
  minWidth: 0,
});

export const overviewStatLayoutSx = {
  justifyContent: 'space-between',
};

export const getOverviewStatLabelSx = (theme: Theme) => ({
  color:
    theme.palette.mode === 'light'
      ? 'text.secondary'
      : alpha('#e2e8f0', 0.74),
});

export const overviewStatValueSx = {
  mt: 0.35,
  fontWeight: 700,
};

export const getOverviewStatSubtitleSx = (theme: Theme) => ({
  color:
    theme.palette.mode === 'light'
      ? 'text.secondary'
      : alpha('#e2e8f0', 0.64),
});

export const getOverviewStatIconSx = (theme: Theme) => ({
  color:
    theme.palette.mode === 'light'
      ? 'primary.main'
      : '#7dd3fc',
});
