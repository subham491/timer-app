import { createSlice,type PayloadAction } from '@reduxjs/toolkit';

import {type UiState,type ThemeMode } from './ui.types';

const initialState: UiState = {
  themeMode: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,

  reducers: {
    setThemeMode: (
      state,
      action: PayloadAction<ThemeMode>
    ) => {
      state.themeMode = action.payload;
    },

    toggleTheme: (state) => {
      state.themeMode =
        state.themeMode === 'light'
          ? 'dark'
          : 'light';
    },
  },
});

export const { setThemeMode, toggleTheme } =
  uiSlice.actions;

export default uiSlice.reducer;