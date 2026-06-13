import { alpha, type Theme } from '@mui/material/styles';

export const getFiltersPaperSx = (theme: Theme) => ({
  p: 1.75,
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
});

export const filtersLayoutSx = {
  direction: { xs: 'column', lg: 'row' } as const,
  spacing: 1.5,
};

export const filterSelectSx = {
  minWidth: { lg: 240 },
};
