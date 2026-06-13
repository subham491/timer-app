import { alpha, type Theme } from '@mui/material/styles';

export const cardRadius = {
  section: 3,
  row: 2,
};

export const getPanelPaperSx = (theme: Theme) => ({
  p: { xs: 1.75, md: 2.25 },
  borderRadius: cardRadius.section,
  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
});

export const panelHeaderSx = {
  justifyContent: 'space-between',
};

export const panelTitleSx = {
  fontWeight: 700,
};

export const modeSwitchesSx = {
  flexWrap: 'wrap',
};

export const fieldSelectSx = {
  minWidth: { xl: 220 },
};

export const billableContainerSx = (theme: Theme) => ({
  px: 1.5,
  minHeight: 40,
  borderRadius: 3,
  bgcolor: alpha(theme.palette.primary.main, 0.05),
  alignItems: 'center',
});

export const actionBarSx = (theme: Theme) => ({
  p: 1.5,
  borderRadius: cardRadius.row,
  bgcolor: alpha(theme.palette.primary.main, 0.04),
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', lg: 'center' },
});

export const secondaryValueSx = {
  mt: 0.5,
  fontWeight: 600,
};

export const primaryValueSx = {
  fontWeight: 700,
};

export const actionButtonSx = {
  minWidth: 118,
};

export const secondaryButtonSx = {
  minWidth: 96,
};
