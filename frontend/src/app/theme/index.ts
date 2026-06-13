import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,

      primary: {
        main: '#1976d2',
      },

      secondary: {
        main: '#7c4dff',
      },

      background: {
        default:
          mode === 'light'
            ? '#f5f7fb'
            : '#0f172a',

        paper:
          mode === 'light'
            ? '#ffffff'
            : '#111827',
      },
    },

    shape: {
      borderRadius: 12,
    },
  });