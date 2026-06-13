import { describe, it, expect } from 'vitest';

import authReducer, { loginSuccess, logout } from '../auth/authSlice';
import type { AuthState } from '@/features/auth/types/auth.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
};

const authenticatedState: AuthState = {
  isAuthenticated: true,
  token: 'valid-jwt-token',
  user: { id: '1', name: 'Aswath', email: 'aswath@example.com', role: 'administrator' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authSlice', () => {
  // ── initial state ───────────────────────────────────────────────────────────

  it('returns the initial state when called with undefined', () => {
    const state = authReducer(undefined, { type: '@@INIT' });

    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  // ── loginSuccess ────────────────────────────────────────────────────────────

  describe('loginSuccess', () => {
    it('sets isAuthenticated to true', () => {
      const next = authReducer(
        initialState,
        loginSuccess({
          token: 'tok',
          user: { id: '1', name: 'Test', email: 'test@test.com', role: 'manager' },
        })
      );

      expect(next.isAuthenticated).toBe(true);
    });

    it('stores the token from the payload', () => {
      const next = authReducer(
        initialState,
        loginSuccess({
          token: 'my-token',
          user: { id: '1', name: 'Test', email: 'test@test.com', role: 'manager' },
        })
      );

      expect(next.token).toBe('my-token');
    });

    it('stores the user object from the payload', () => {
      const user = {
        id: '42',
        name: 'Aswath',
        email: 'aswath@soliton.com',
        role: 'administrator' as const,
      };
      const next = authReducer(initialState, loginSuccess({ token: 'tok', user }));

      expect(next.user).toEqual(user);
    });

    it('replaces an existing authenticated session with new credentials', () => {
      const newUser = {
        id: '99',
        name: 'Ravi',
        email: 'ravi@soliton.com',
        role: 'reportViewer' as const,
      };
      const next = authReducer(
        authenticatedState,
        loginSuccess({ token: 'new-token', user: newUser })
      );

      expect(next.token).toBe('new-token');
      expect(next.user).toEqual(newUser);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('sets isAuthenticated to false', () => {
      const next = authReducer(authenticatedState, logout());

      expect(next.isAuthenticated).toBe(false);
    });

    it('clears the token', () => {
      const next = authReducer(authenticatedState, logout());

      expect(next.token).toBeNull();
    });

    it('clears the user', () => {
      const next = authReducer(authenticatedState, logout());

      expect(next.user).toBeNull();
    });

    it('is a no-op when already logged out', () => {
      const next = authReducer(initialState, logout());

      expect(next).toEqual(initialState);
    });
  });
});
