import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { clearPersistedAuthState, loadPersistedAuthState, persistAuthState } from './authStorage';
import { type AuthState } from './auth.types';

const defaultState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
};

const initialState: AuthState = loadPersistedAuthState() ?? defaultState;

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        user: AuthState['user'];
      }>
    ) => {
      state.isAuthenticated = true;

      state.token = action.payload.token;

      state.user = action.payload.user;

      persistAuthState({
        token: state.token,
        user: state.user,
      });
    },

    logout: (state) => {
      state.isAuthenticated = false;

      state.token = null;

      state.user = null;

      clearPersistedAuthState();
    },
  },
});

export const { loginSuccess, logout } =
  authSlice.actions;

export default authSlice.reducer;
