import {type  PropsWithChildren } from 'react';

import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
} from '@mui/material';

import { getTheme } from '@/app/theme';

import { useAppSelector } from '@/store/hooks';

const ThemeProvider = ({
  children,
}: PropsWithChildren) => {
  const mode = useAppSelector(
    (state) => state.ui.themeMode
  );

  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />

      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;