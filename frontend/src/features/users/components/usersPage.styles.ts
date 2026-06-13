import { alpha, type Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/material';

export const pageRootSx: SxProps<Theme> = {
  gap: 1.25,
};

export const pageTitleSx: SxProps<Theme> = {
  fontSize: { xs: '1.05rem', md: '1.15rem' },
  fontWeight: 700,
  letterSpacing: '-0.02em',
};

export const pageSubtitleSx: SxProps<Theme> = {
  fontSize: '0.8rem',
};

export const getToolbarPaperSx = (theme: Theme) => ({
  borderRadius: 2,
  backgroundColor: alpha(theme.palette.background.paper, 0.88),
  boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.05)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
  backdropFilter: 'blur(12px)',
  px: { xs: 1.25, md: 1.5 },
  py: { xs: 1.1, md: 1.25 },
});

export const getSummaryStripPaperSx = (theme: Theme) => ({
  borderRadius: 3,
  backgroundColor: alpha(theme.palette.background.paper, 0.62),
  boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.035)}`,
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 0.25,
  px: 1,
  py: 0.55,
});

export const summaryMetricSx: SxProps<Theme> = (theme) => ({
  minWidth: 0,
  px: 1,
  py: 0.75,
  borderRadius: 2,
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.02),
  },
});

export const getTablePaperSx = () => ({
  backgroundColor: 'transparent',
  overflow: 'hidden',
});

export const getUserCardSx = (theme: Theme) => ({
  borderRadius: 2,
  backgroundColor: alpha(theme.palette.background.paper, 0.96),
  boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.05)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.38)}`,
  p: 1.35,
  minHeight: 216,
  transition: 'transform 160ms ease, box-shadow 160ms ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.07)}`,
  },
});

export const drawerContentSx: SxProps<Theme> = {
  width: { xs: '100vw', sm: 520, md: 560 },
  maxWidth: '100%',
  backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.98),
};

export const drawerHeaderSx: SxProps<Theme> = (theme) => ({
  px: 2.5,
  py: 2,
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
});

export const drawerBodySx: SxProps<Theme> = {
  px: 2.5,
  py: 1.5,
  overflowY: 'auto',
};

export const drawerFooterSx: SxProps<Theme> = (theme) => ({
  mt: 'auto',
  px: 2.5,
  py: 1.75,
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.36)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.92),
});

export const drawerSectionTitleSx: SxProps<Theme> = {
  fontSize: '0.82rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'text.secondary',
};

export const primaryActionButtonSx: SxProps<Theme> = {
  borderRadius: 1.75,
  boxShadow: 'none',
};
